import { z } from "zod";

import { formatting, phpSerialize } from "../common";
import { diffObject } from "../common/diff";
import { Components } from "../core/components";
import { Options } from "../core/options";
import { Post } from "../core/post";
import { DateTimeUtil } from "../core/utils/date-time.util";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { TaxonomyUtil } from "../core/utils/taxonomy.util";
import { component } from "../decorators/component";
import { PostsQuery } from "../query-builder";
import { PostTrx, RevisionTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";
import { MetaCrud } from "./meta.crud";

import type * as types from "../types";
import { Vars } from "../core/vars";
import { RevisionUtil } from "../core/utils/revision.util";

type PostUpsert = z.infer<typeof val.trx.postUpsert>;

@component()
export class PostCrud extends Crud {
  constructor(components: Components) {
    super(components);
  }

  // _wp_translate_postdata
  protected async translate<T extends PostUpsert | Partial<PostUpsert>>(
    data: T
  ): Promise<T> {
    const postId = data.ID ?? undefined;

    let diffData = {} as Partial<PostUpsert>;
    let currentPost = {} as Partial<PostUpsert>;

    if (postId) {
      currentPost = (await this.getAsUpsert(postId)).data;
      diffData = diffObject(data, currentPost);
    } else {
      diffData = structuredClone(data);
    }

    const { user, userId } = await this.getUser();

    const postUtil = this.components.get(PostUtil);
    const postType = postUtil.getTypeObject(data.post_type);

    if (postId && !(await user.can("edit_post", postId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit posts as this user"
      );
    }

    if (!postId && !user.can(postType?.capabilities?.create_posts)) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit posts as this user"
      );
    }

    if (
      userId !== data.post_author &&
      !(await user.can(postType?.capabilities?.edit_others_posts))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit posts as this user"
      );
    }

    if (
      diffData.post_status &&
      "private" == diffData.post_status &&
      postType?.capabilities?.publish_posts &&
      !(await user.can(postType.capabilities.publish_posts))
    ) {
      data.post_status = currentPost?.post_status ?? "pending";
    }

    const publishedStatuses = ["publish", "future"];
    /*
     * Posts 'submitted for approval' are submitted to $_POST the same as if they were being published.
     * Change status from 'publish' to 'pending' if user lacks permissions to publish or to resave published posts.
     */
    if (
      diffData.post_status &&
      (!data.post_status || publishedStatuses.includes(data.post_status)) &&
      !(await user.can(postType?.capabilities?.publish_posts)) &&
      (!publishedStatuses.includes(currentPost?.post_status ?? "") ||
        !postId ||
        !(await user.can("edit_post", postId)))
    ) {
      data.post_status = "pending";
    }

    if (diffData.post_status && "auto-draft" === currentPost.post_status) {
      data.post_status = "draft";
    }

    if (
      diffData.post_password &&
      diffData.post_password?.length > 0 &&
      !(await user.can(postType?.capabilities?.publish_posts))
    ) {
      data.post_password = currentPost.post_password ?? "";
    }

    if (diffData.post_category && diffData.post_category.length > 0) {
      const category = await this.components.get(TaxonomyUtil).get("category");
      if (!(await user.can(category.props?.capabilities?.assign_terms))) {
        data.post_category = currentPost.post_category ?? undefined;
      }
    }

    return data;
  }

  private async formReturnData(
    post: Post,
    options: {
      password: string;
      editable: boolean;
    }
  ) {
    const props = post.props;

    if (!props) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid Post");
    }

    const { password, editable } = options;

    if (!editable) {
      props.post_content = formatting.trimMarkupComments(props.post_content);
      props.post_excerpt = formatting.trimMarkupComments(props.post_excerpt);
      if (!this.checkPasswordProtectedPost(props, password)) {
        post.props.post_content = "";
        post.props.post_excerpt = "";
        post.props.post_password = "";
      }
    }

    const author = await post.author();
    const metas = await post.meta.props();

    // public meta is key without _ prefix
    const publicMetas = Object.entries(metas).reduce((acc, [key, value]) => {
      if (key[0] !== "_") {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      ...props,
      metas: editable ? metas : publicMetas,
      author: {
        ID: author?.ID,
        display_name: author?.display_name,
        user_nicename: author?.user_nicename,
      },
      tags: ((await post.terms("post_tag")) ?? []).map((term) => ({
        term_id: term.term_id,
        name: term.name,
        slug: term.slug,
      })),
      categories: ((await post.terms("category")) ?? []).map((term) => ({
        term_id: term.term_id,
        name: term.name,
        slug: term.slug,
      })),
    };
  }

  async getAsUpsert(postId: number, defaultValue: Partial<PostUpsert> = {}) {
    const getData = (await this.get(postId, { context: "edit" })).data;
    const postUtil = this.components.get(PostUtil);
    const post = await postUtil.get(postId);

    const data = {
      ...getData,
      meta_input: await post.meta.props(),
      tags_input: (await post.terms("post_tag"))?.map((tag) => tag.term_id),
      post_category: (await post.terms("category"))?.map(
        (category) => category.term_id
      ),
    };

    return this.returnValue(
      val.trx.postUpsert.parse({ ...data, ...defaultValue })
    );
  }

  private async checkPermission(
    action: "edit_post" | "delete_post",
    postType: string,
    postId: number
  ) {
    const { user } = await this.getUser();

    const postUtil = this.components.get(PostUtil);
    const postTypeObject = postUtil.getTypeObject(postType);

    return (
      postTypeObject?.capabilities &&
      postTypeObject.capabilities[action] &&
      (await user.can(postTypeObject.capabilities[action], postId))
    );
  }

  async get<T extends "view" | "edit" | "embed">(
    postIdOrSlug: number | string,
    options?: Partial<{
      context: T;
      password: string;
      postType: types.PostType;
    }>
  ) {
    const { password = "", context = "view" } = options ?? {};

    const postUtil = this.components.get(PostUtil);

    const post =
      typeof postIdOrSlug == "string"
        ? await postUtil.getBySlug(postIdOrSlug)
        : await postUtil.get(postIdOrSlug);

    if (
      !post?.props?.ID ||
      (options?.postType && post.props.post_type !== options.postType)
    ) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `Post not found - ${postIdOrSlug}`
      );
    }

    const postId = post.props.ID;
    const { user } = await this.getUser();

    const postType = post.props.post_type;
    if (
      context == "edit" &&
      !(await this.checkPermission("edit_post", postType, postId))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this post"
      );
    }

    // Private post
    if (
      post.props.post_status == "private" &&
      !(await this.canReadPrivatePosts(postType))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to view this post"
      );
    }

    const role = await user.role();
    if (role.is("anonymous") && post.props.post_status !== "publish") {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to view this post"
      );
    }

    return this.returnValue(
      await this.formReturnData(post, {
        password,
        editable: context == "edit",
      }),
      { protected: post.props.post_password != "" }
    );
  }

  // edit_post
  async update(postId: number, data: Partial<PostUpsert>) {
    data.ID = postId;
    const currentPost = (await this.getAsUpsert(postId, { context: "edit" }))
      .data;

    data.ID = currentPost.ID;
    data.post_type = currentPost.post_type;
    data.post_mime_type = currentPost.post_mime_type;

    data = await this.translate(data);

    if (data.meta_input) {
      const metaCrud = this.components.get(MetaCrud);
      await metaCrud.update("post", postId, data.meta_input, "sync");
      data.meta_input = undefined;
    }

    const postTrx = this.components.get(PostTrx);
    const result = await postTrx.upsert(data);

    const postUtil = this.components.get(PostUtil);
    const postType = postUtil.getTypeObject(data.post_type);

    if (
      postType?.supports.includes("revisions") &&
      data.post_content !== currentPost.post_content
    ) {
      const revisionTrx = this.components.get(RevisionTrx);
      await revisionTrx.save(postId);
    }

    return this.returnValue(result);
  }

  // wp_write_post
  async create(data: Partial<PostUpsert>) {
    if (!data.post_type || !(await this.canEditPosts(data.post_type))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "post_type is not defined or you are not allowed to edit posts in this post type"
      );
    }

    if (data.post_type !== "attachment") {
      data.post_mime_type = "";
    }

    if (data.ID && data.ID > 0) {
      return await this.update(data.ID, val.trx.postUpsert.parse(data));
    }

    data.ID = undefined;
    data = await this.translate(data);

    const postTrx = this.components.get(PostTrx);
    return this.returnValue(await postTrx.upsert(data));
  }

  async delete(postId: number) {
    const postUtil = this.components.get(PostUtil);
    const post = await postUtil.get(postId);
    if (!post.props?.ID) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `Post not found - ${postId}`
      );
    }

    const postType = post.props.post_type;
    if (!(await this.checkPermission("delete_post", postType, postId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to delete this post"
      );
    }

    const postTrx = this.components.get(PostTrx);
    return this.returnValue(
      await postTrx.remove(postId, true).then((v) => typeof v !== "undefined")
    );
  }

  private async trashOrUntrash(postId: number, trash: boolean) {
    const postUtil = this.components.get(PostUtil);
    const post = await postUtil.get(postId);
    if (!post.props?.ID) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `Post not found - ${postId}`
      );
    }

    const postType = post.props.post_type;
    if (!(await this.checkPermission("edit_post", postType, postId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this post"
      );
    }

    const postTrx = this.components.get(PostTrx);
    return trash
      ? await postTrx.trash(postId).then((v) => typeof v !== "undefined")
      : await postTrx.untrash(postId).then((v) => typeof v !== "undefined");
  }

  async trash(postId: number) {
    return this.returnValue(await this.trashOrUntrash(postId, true));
  }

  async untrash(postId: number) {
    return this.returnValue(await this.trashOrUntrash(postId, false));
  }

  private async checkAutosavePermission(parent: Post) {
    const { user } = await this.getUser();

    if (!parent.props) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid parameters.");
    }

    if (!(await user.can("edit_post", parent.props.ID))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to autosave of this post"
      );
    }

    return true;
  }

  // class-wp-rest-autosaves-controller.php create_item
  async autosave(parentId: number, data: Partial<PostUpsert>) {
    const { user } = await this.getUser();

    const vars = this.components.get(Vars);
    vars.DOING_AUTOSAVE = true;

    const postUtil = this.components.get(PostUtil);
    const parent = await postUtil.get(parentId);

    await this.checkAutosavePermission(parent);

    data = await this.translate(data);

    data.post_parent = parentId;
    const isDraft =
      data.post_status == "draft" || data.post_status == "auto-draft";

    let autosaveId: number | undefined;
    if (isDraft && user.props?.ID === data.post_author) {
      /*
       * Draft posts for the same author: autosaving updates the post and does not create a revision.
       * Convert the post object to an array and add slashes, wp_update_post() expects escaped array.
       */
      const postTrx = this.components.get(PostTrx);
      autosaveId = await postTrx.upsert(formatting.slash(data));
    } else {
      const revisionTrx = this.components.get(RevisionTrx);

      autosaveId = await revisionTrx.autosave(data);
    }

    if (!autosaveId) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Failed to autosave post");
    }

    const post = await postUtil.get(autosaveId);

    if (!post.props) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Failed to get autosave post after saving"
      );
    }

    return this.returnValue(post.props);
  }

  async getAutosave(parentId: number) {
    const { user } = await this.getUser();
    const postUtil = this.components.get(PostUtil);
    const parent = await postUtil.get(parentId);

    await this.checkAutosavePermission(parent);
    const revisionUtil = this.components.get(RevisionUtil);

    const autosave = await revisionUtil.getAutosave(parentId, user.props?.ID);

    if (!autosave?.props) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Autosave not found");
    }

    return await this.getAsUpsert(autosave.props.ID);
  }

  async copy(postId: number) {
    const { user } = await this.getUser();
    const postUtil = this.components.get(PostUtil);

    const post = await postUtil.get(postId);

    if (!post.props || !user.props?.ID) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Post not found");
    }

    const userId = user.props.ID;

    if (post.props.post_type == "attachment") {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Sorry, you are not allowed to copy attachments"
      );
    }

    await this.checkPermission("edit_post", post.props.post_type, postId);

    const queryUtil = this.components.get(QueryUtil);
    const postTitle = await (async () => {
      const targetPostTitle = post?.props?.post_type as string;
      let postTitle = `Copy of ${post?.props?.post_title}`;
      for (let i = 0; i < 10; i++) {
        const copyPosts = await queryUtil.posts((query) => {
          query
            .where("post_title", postTitle)
            .where("post_type", targetPostTitle)
            .builder.limit(1);
        });

        if (!copyPosts) {
          return postTitle;
        }
        postTitle = `Copy of ${post?.props?.post_title} ${i + 2}`;
      }
      const maxSuffix = 10;
      return `Copy of ${post?.props?.post_title} ${Math.floor(
        Math.random() * (maxSuffix + 999990010 - maxSuffix + 1) + maxSuffix + 1
      )}`;
    })();

    const postUpsert = (await this.getAsUpsert(postId)).data;
    postUpsert.ID = undefined;
    postUpsert.post_status = "draft";
    postUpsert.post_title = postTitle;
    postUpsert.post_author = userId;

    const copiedPostId = (await this.create(postUpsert)).data;

    return this.returnValue(copiedPostId);
  }

  async list<TCountGroupBy extends keyof types.WpPosts>(
    args: Partial<z.infer<typeof val.crud.postListParams>>,
    options?: Partial<{
      password: string;
      postTypes: types.PostType[];
      mimeTypes: string[];
      countGroupBy: TCountGroupBy;
      context: "view" | "edit" | "embed";
    }>
  ) {
    const {
      password = "",
      postTypes = ["post"] as types.PostType[],
      context = "view",
      countGroupBy: includeCountGroupBy,
    } = options ?? {};

    const queryUtil = this.components.get(QueryUtil);
    const postUtil = this.components.get(PostUtil);

    const parsedArgs = val.crud.postListParams.parse(args ?? {});
    const { user } = await this.getUser();
    const role = await user.role();

    let canReadPrivatePosts = true;
    for (const postType of postTypes) {
      const postTypeObject = postUtil.getTypeObject(postType);
      if (!postTypeObject) {
        throw new CrudError(StatusMessage.BAD_REQUEST, `Invalid post type`);
      }

      if (context == "edit" && !(await this.canEditPosts(postType))) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "Sorry, you are not allowed to edit posts in this post type"
        );
      }

      canReadPrivatePosts =
        canReadPrivatePosts && (await this.canReadPrivatePosts(postType));
    }

    let stickyPostIds: number[] = [];
    if (parsedArgs.sticky) {
      try {
        stickyPostIds = z
          .array(z.number())
          .parse(
            await this.components
              .get(Options)
              .get("sticky_posts", { default: phpSerialize([]) })
          );
      } catch (e) {
        stickyPostIds = [0];
      }
    }

    const protectedPostIds = [];
    const dateTimeUtil = this.components.get(DateTimeUtil);

    const buildQuery = (query: PostsQuery) => {
      const { column } = query.alias;
      const offset =
        parsedArgs.offset ?? (parsedArgs.page - 1) * parsedArgs.per_page;
      const limit = parsedArgs.per_page;

      query.builder.offset(offset).limit(limit).groupBy(column("posts", "ID"));

      query.whereIn("post_type", postTypes);

      // Check for mime types
      if (
        postTypes.includes("attachment") &&
        Array.isArray(options?.mimeTypes)
      ) {
        query.andWhere((query) => {
          for (const mimeType of options.mimeTypes as string[]) {
            // Use whereLike if mimeType does not have a slash
            if (!mimeType.includes("/")) {
              query.or.whereLike("post_mime_type", mimeType);
            } else {
              query.or.where("post_mime_type", mimeType);
            }
          }
        });
      }

      if (parsedArgs.orderby) {
        query.builder.orderBy(
          column("posts", parsedArgs.orderby),
          parsedArgs.order
        );
      }

      if (role.is("anonymous")) {
        query.where("post_status", "publish").andWhere((query) => {
          query.where("post_password", password).or.where("post_password", "");
        });
      }

      if (!canReadPrivatePosts) {
        query.andWhereNot((query) => query.where("post_status", "private"));
      }

      if (stickyPostIds.length > 0 || Array.isArray(parsedArgs.include)) {
        query.whereIn("ID", [...stickyPostIds, ...(parsedArgs.include ?? [])]);
      }

      if (Array.isArray(parsedArgs.exclude)) {
        query.not.andWhere((query) =>
          query.whereIn("ID", parsedArgs.exclude as number[])
        );
      }

      if (parsedArgs.search) {
        query.andWhere((query) => {
          const searchColumns = [
            "post_title",
            "post_excerpt",
            "post_content",
          ] as const;
          for (const searchColumn of searchColumns) {
            parsedArgs.search &&
              query.or.whereLike(searchColumn, parsedArgs.search);
          }
        });
      }

      if (parsedArgs.meta && context == "edit") {
        query
          .withMeta()
          .where("meta_key", parsedArgs.meta.key)
          .where("meta_value", parsedArgs.meta.value);
      }

      if (parsedArgs.exclude_meta && context == "edit") {
        query.withoutMeta(
          parsedArgs.exclude_meta.key,
          parsedArgs.exclude_meta.value
        );
      }

      const taxonomyNames: types.TaxonomyName[] = [];

      for (const key of Object.keys(parsedArgs) as Array<
        keyof typeof parsedArgs
      >) {
        if (!parsedArgs[key] || key == "meta") continue;
        const value = parsedArgs[key];

        switch (key) {
          case "after":
          case "before":
            query.where(
              "post_date",
              dateTimeUtil.get(new Date(value as string)).mySQLDatetime,
              key == "after" ? ">=" : "<="
            );
            break;

          case "modified_after":
          case "modified_before":
            query.where(
              "post_date",
              dateTimeUtil.get(new Date(value as string)).mySQLDatetime,
              key == "modified_after" ? ">=" : "<="
            );
            break;
          case "author":
            Array.isArray(value) && query.whereIn("post_author", value);
            break;
          case "author_exclude":
            Array.isArray(value) &&
              query.andWhereNot((query) => query.whereIn("post_author", value));
            break;
          case "slug":
            query.where("post_name", value as string);
            break;
          case "status":
            Array.isArray(value) && query.whereIn("post_status", value);
            break;
          case "status_exclude":
            Array.isArray(value) &&
              query.andWhereNot((query) => query.whereIn("post_status", value));
            break;
          case "categories":
          case "categories_exclude":
            taxonomyNames.push("category");
            break;
          case "tags":
          case "tags_exclude":
            taxonomyNames.push("post_tag");
        }
      }

      if (taxonomyNames.length > 0) {
        query.withTerms(taxonomyNames, (query) => {
          query[parsedArgs.tax_relation === "OR" ? "orWhere" : "andWhere"](
            (query) => {
              if (
                (parsedArgs.categories && parsedArgs.categories.length > 0) ||
                (parsedArgs.tags && parsedArgs.tags.length > 0)
              ) {
                query.whereIn("term_id", [
                  ...(parsedArgs.categories ?? []),
                  ...(parsedArgs.tags ?? []),
                ]);
              }
              if (
                (parsedArgs.categories_exclude &&
                  parsedArgs.categories_exclude.length > 0) ||
                (parsedArgs.tags_exclude && parsedArgs.tags_exclude.length > 0)
              ) {
                query.andWhereNot((query) =>
                  query.whereIn("term_id", [
                    ...(parsedArgs.categories_exclude ?? []),
                    ...(parsedArgs.tags_exclude ?? []),
                  ])
                );
              }
            }
          );
        });
      }
    };

    const posts =
      (await queryUtil.posts((query) => {
        buildQuery(query);
      })) ?? [];

    const counts = await queryUtil.posts((query) => {
      buildQuery(query);
      query.count("posts", "ID");
    }, val.query.resultCount);

    const countGroupBy = (
      includeCountGroupBy
        ? await queryUtil.posts((query) => {
            buildQuery(query);
            query
              .where("post_type", postTypes)
              .countGroupby("posts", includeCountGroupBy);
          }, val.query.resultCountGroupBy(includeCountGroupBy))
        : []
    ) as
      | Array<
          {
            [K in TCountGroupBy]: string;
          } & { count: number }
        >
      | undefined;

    const data = [];
    for (const post of postUtil.toPosts(posts)) {
      const props = post.props as types.WpPosts;

      if (props.post_password != "") {
        protectedPostIds.push(props.ID);
      }

      data.push(
        await this.formReturnData(post, {
          password,
          editable: context == "edit",
        })
      );
    }

    const pagination = this.pagination({
      page: parsedArgs.page,
      limit: parsedArgs.per_page,
      count: counts?.count ?? 0,
    });

    return this.returnValue(data, {
      pagination,
      protected: protectedPostIds,
      countGroupBy,
    });
  }
}
