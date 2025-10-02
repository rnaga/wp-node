import { z } from "zod";

import { currentUnixTimestamp, formatting } from "../common";
import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Options } from "../core/options";
import { Post } from "../core/post";
import { CommentUtil } from "../core/utils/comment.util";
import { DateTimeUtil } from "../core/utils/date-time.util";
import { LinkUtil } from "../core/utils/link.util";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { TaxonomyUtil } from "../core/utils/taxonomy.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { CommentTrx } from "./comment.trx";
import { MetaTrx } from "./meta.trx";
import { OptionsTrx } from "./options.trx";
import { RevisionTrx } from "./revision.trx";
import { TermTrx } from "./term.trx";
import { Trx } from "./trx";

import type * as types from "../types";
import { Logger } from "../core/logger";
type DataUpsert = z.infer<typeof val.trx.postUpsert>;
type Data = Partial<DataUpsert> &
  Required<
    Pick<
      DataUpsert,
      | "ID"
      | "context"
      | "file"
      | "post_date"
      | "post_date_gmt"
      | "post_status"
      | "post_type"
      | "post_title"
      | "post_content"
      | "post_excerpt"
      | "post_name"
      | "post_parent"
      | "pinged"
      | "import_id"
      | "post_content_filtered"
      | "tags_input"
    >
  >;

@transactions()
export class PostTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private config: Config,
    private postUtil: PostUtil,
    private taxonomyUtil: TaxonomyUtil,
    private commentUtil: CommentUtil // private validator: Validator
  ) {
    super(components);
  }

  // update_posts_count
  async updateCount() {
    const queryUtil = this.components.get(QueryUtil);

    const counts = await queryUtil.posts((query) => {
      query.countPublished();
    }, val.query.resultCount); //z.array(z.object({ count: z.number() })));

    const count = counts?.count ?? 0;

    const optionsTrx = this.components.get(OptionsTrx);
    await optionsTrx.insert("post_count", `${count}`);
  }

  // part of remove_user_from_blog
  async changeAuthor(fromUserId: number, toUserId: number) {
    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("posts"))
        .where("post_author", fromUserId)
        .update({
          post_author: toUserId,
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(
        `Failed to change author from: ${fromUserId} to: ${toUserId} - ${e}`
      );
    }
    await trx.commit();
    return true;
  }

  // wp_insert_post
  async upsert(input: Partial<DataUpsert>) {
    const current = this.components.get(Current);
    const options = this.components.get(Options);
    const dateTimeUtil = this.components.get(DateTimeUtil);

    let update = false;

    let previousStatus: string | undefined = "new";
    let postBefore: Post | undefined = undefined;
    let desiredPostSlug: string | undefined = undefined;

    // Update
    if (input.ID && 0 < input.ID) {
      update = true;
      postBefore = await this.postUtil.get(input.ID);

      if (!postBefore.props) {
        throw new Error(`Post not found - ${input.ID}`);
      }

      input.guid = postBefore.props.guid;
      previousStatus = postBefore.props.post_status;
      desiredPostSlug = await postBefore.meta.get<string>(
        "_wp_desired_post_slug"
      );

      // Combine input with existing record
      input = {
        ...(postBefore.props as any),
        post_category: ((await postBefore.terms("category")) ?? []).map(
          (v) => v.term_id
        ),
        tags_input: ((await postBefore.terms("post_tag")) ?? []).map(
          (v) => v.term_id
        ),
        ...input,
      };
    }

    const parsedInput = val.trx.postUpsert.parse(input);
    const postDate = dateTimeUtil.get(input.post_date);

    const data: Data = {
      ID: parsedInput.ID ?? 0,
      context: parsedInput.context,
      file: parsedInput.file,
      guid: parsedInput.guid,
      post_date: postDate.mySQLDatetime,
      post_date_gmt: postDate.mySQLGMTDatetime,
      meta_input: parsedInput.meta_input,
      post_status: parsedInput.post_status ?? "draft",
      post_type: parsedInput.post_type ?? "post",
      post_title: parsedInput.post_title,
      post_content: parsedInput.post_content,
      post_excerpt: parsedInput.post_excerpt,
      post_name: parsedInput.post_name,
      post_parent: parsedInput.post_parent,
      pinged: parsedInput.pinged,
      import_id: parsedInput.import_id,
      post_content_filtered: parsedInput.post_content_filtered,
      tags_input: parsedInput.tags_input,
      tax_input: parsedInput.tax_input,
    };

    data.post_name =
      parsedInput.post_name ??
      (update && postBefore && postBefore.props
        ? postBefore.props.post_name
        : "");

    const postTypeObject = this.postUtil.getTypeObject(data.post_type);

    // Check empry fields
    if (
      ["editor", "title", "excerpt"].every((v) =>
        postTypeObject?.supports.includes(v)
      ) &&
      !parsedInput.post_content &&
      !parsedInput.post_title &&
      !parsedInput.post_excerpt
    ) {
      throw new Error("Content, title, and excerpt are empty.");
    }

    if (
      data.post_type == "attachment" &&
      !["inherit", "private", "trash", "auto-draft"].includes(data.post_status)
    ) {
      data.post_status = "inherit";
    }

    let postCategory: number[] = [];
    if (Array.isArray(parsedInput.post_category)) {
      postCategory = parsedInput.post_category.filter((v) => v > 0);
    } else if (update && !parsedInput.post_category) {
      postCategory = !postBefore
        ? []
        : (await postBefore.terms("category"))?.map((term) => term.term_id) ??
          [];
    }

    // Make sure we set a valid category.
    if (
      0 >= postCategory.length &&
      "post" === data.post_type &&
      "auto-draft" !== data.post_status
    ) {
      const defaultCategory =
        (await options.get<number | number[]>("default_category")) ?? [];
      if (!Array.isArray(defaultCategory)) {
        postCategory = [defaultCategory];
      }
    }

    data.post_category = postCategory;

    /*
     * Don't allow contributors to set the post slug for pending review posts.
     *
     * For new posts check the primitive capability, for updates check the meta capability.
     */
    if (
      "pending" === data.post_status &&
      ((!update &&
        postTypeObject?.capabilities &&
        !(await current.user?.can(
          postTypeObject.capabilities["publish_posts"]
        ))) ||
        (update && !(await current.user?.can("publish_post", data.ID))))
    ) {
      data.post_name = "";
    }

    const validator = this.components.get(Validator);

    /*
     * Create a valid post name. Drafts and pending posts are allowed to have
     * an empty post name.
     */
    if (0 >= data.post_name.length) {
      if (!["draft", "pending", "auto-draft"].includes(data.post_status)) {
        data.post_name =
          validator.fieldSafe("posts", "post_title", data.post_title) ?? "";
      } else {
        data.post_name = "";
      }
    } else {
      // New post, or slug has changed.
      data.post_name =
        validator.fieldSafe("posts", "post_title", data.post_name) ?? "";
    }

    data.post_modified = data.post_date;
    data.post_modified_gmt = data.post_date_gmt;

    if (update) {
      const currentDateTime = dateTimeUtil.get();
      data.post_modified = currentDateTime.mySQLDatetime;
      data.post_modified_gmt = currentDateTime.mySQLGMTDatetime;
    }

    if ("attachment" !== data.post_type) {
      const postDate = dateTimeUtil.get(data.post_date_gmt);
      if ("publish" === data.post_status && postDate.isFuture()) {
        data.post_status = "future";
      } else if ("future" === data.post_status && !postDate.isFuture()) {
        data.post_status = "publish";
      }
    }

    // Comment status.
    data.comment_status = parsedInput.comment_status
      ? parsedInput.comment_status
      : update
      ? "closed"
      : await this.commentUtil.getDefaultStatus(data.post_type);

    // These variables are needed by compact() later.
    data.post_author =
      parsedInput.post_author > 0
        ? parsedInput.post_author
        : current.user?.props?.ID ?? -1;

    data.ping_status =
      parsedInput.ping_status ??
      this.commentUtil.getDefaultStatus(data.post_type, "pingback");

    data.to_ping = data.to_ping
      ? validator.fieldSafe("posts", "to_ping", parsedInput.to_ping)
      : "";

    /*
     * The 'wp_insert_post_parent' filter expects all variables to be present.
     * Previously, these variables would have already been extracted
     */
    data.menu_order = parsedInput.menu_order ?? 0;

    data.post_password = parsedInput.post_password ?? "";
    if ("private" === data.post_status) {
      data.post_password = "";
    }

    const postNameTrashedSuffix =
      this.config.config.constants.TRASHED_SUFFIX_TO_POST_NAME_FOR_POST;

    /*
     * If the post is being untrashed and it has a desired slug stored in post meta,
     * reassign it.
     */
    if ("trash" === previousStatus && "trash" !== data.post_status) {
      data.post_name = data.post_name.endsWith(postNameTrashedSuffix)
        ? data.post_name.replace(postNameTrashedSuffix, "")
        : data.post_name;

      if (desiredPostSlug) {
        data.post_name = desiredPostSlug;
        const metaTrx = this.components.get(MetaTrx);

        await metaTrx.remove("post", {
          objectId: data.ID,
          key: "_wp_desired_post_slug",
        });
      }
    }

    // When trashing an existing post, change its slug to allow non-trashed posts to use it.
    if (
      "trash" === data.post_status &&
      "trash" !== previousStatus &&
      "new" !== previousStatus &&
      postBefore?.props?.post_name &&
      !postBefore.props.post_name.endsWith(postNameTrashedSuffix)
    ) {
      const metaTrx = this.components.get(MetaTrx);
      await metaTrx.upsert(
        "post",
        data.ID,
        "_wp_desired_post_slug",
        data.post_name
      );

      data.post_name = `${postBefore.props.post_name}${postNameTrashedSuffix}`;
    }

    data.post_name = await this.postUtil.getUniqueSlug(data.post_name, data.ID);

    // Don't unslash.
    data.post_mime_type = parsedInput.post_mime_type ?? "";

    let dataUpsert: any = {};

    try {
      dataUpsert = validator.execAny(
        update ? val.trx.postUpdate : val.trx.postInsert,
        Object.entries(data)
          .map(([key, value]) => ({
            [key]: formatting.unslash(value),
          }))
          .reduce((obj, item) => ({ ...obj, ...item }), {})
      );
    } catch (e) {
      this.logger.warn(`parse error: ${e}`, { data });
      throw e;
    }

    if (!dataUpsert) {
      throw new Error(`Invalid post data - ${JSON.stringify(data)}`);
    }

    dataUpsert.post_date = data.post_date;
    dataUpsert.post_date_gmt = data.post_date_gmt;

    let trx = await this.database.transaction;
    try {
      if (update) {
        await trx
          .table(this.tables.get("posts"))
          .where("ID", data.ID)
          .update(dataUpsert);
      } else {
        await trx
          .insert(dataUpsert)
          .into(this.tables.get("posts"))
          .then((v) => {
            data.ID = v[0];
          });
      }
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert post - ${e}`);
    }
    await trx.commit();

    const post = await this.postUtil.get(data.ID);
    if (!post.props) {
      throw new Error(`Post Not Found - ${data.ID}`);
    }
    const postId = post.props.ID;

    // Set slug with title
    if (
      0 >= data.post_name.length &&
      !["draft", "pending", "auto-draft"].includes(data.post_status)
    ) {
      data.post_name = await this.postUtil.getUniqueSlug(
        formatting.slug(data.post_title),
        post
      );

      trx = await this.database.transaction;
      try {
        await trx.table(this.tables.get("posts")).where("ID", postId).update({
          post_name: data.post_name,
        });
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to update slug - ${e}`);
      }
      await trx.commit();
    }

    // Sync categories
    const taxonomyCategory = await this.taxonomyUtil.get("category");
    if (
      !taxonomyCategory.isDefault &&
      taxonomyCategory.props?.objectType == data.post_type
    ) {
      await this.syncCategories(post.props.ID, data.post_category);
    }

    // Sync tags
    const taxonomyPostTag = await this.taxonomyUtil.get("post_tag");
    if (
      data.tags_input &&
      !taxonomyPostTag.isDefault &&
      taxonomyPostTag.props?.objectType == data.post_type
    ) {
      await this.syncTerms(postId, data.tags_input);
    }

    let taxonomyInput = data.tax_input;

    // Add default term for all associated custom taxonomies.
    if ("auto-draft" !== data.post_status) {
      for (const taxonomy of await this.taxonomyUtil.getList({
        objectType: post.props.post_type,
      })) {
        if (!taxonomy.props?.default_term) {
          continue;
        }

        // Filter out empty terms.
        if (taxonomyInput && taxonomyInput[taxonomy.name]) {
          taxonomyInput[taxonomy.name] = taxonomyInput[taxonomy.name].filter(
            (v) => typeof v == "number" || v.length > 0
          );
        }

        // Passed custom taxonomy list overwrites the existing list if not empty.
        const terms = (
          (await this.components.get(QueryUtil).terms((query) => {
            query.withObjectIds([postId]).where("taxonomy", taxonomy.name);
          })) ?? []
        ).map((v) => v.term_id) as number[];
        if (
          terms.length > 0 &&
          (!taxonomyInput || !taxonomyInput[taxonomy.name])
        ) {
          taxonomyInput = { ...taxonomyInput, [taxonomy.name]: terms };
        }

        // Set default term id
        if (
          taxonomy.props.default_term &&
          (!taxonomyInput || !taxonomyInput[taxonomy.name])
        ) {
          taxonomyInput = {
            ...taxonomyInput,
            [taxonomy.name]: [taxonomy.props.default_term],
          };
        }
      }
    }

    for (const [taxonomyName, tags] of Object.entries(taxonomyInput ?? {})) {
      const taxonomy = await this.taxonomyUtil.get(taxonomyName);
      if (taxonomy.isDefault) {
        continue;
      }

      if (
        taxonomy.props?.capabilities?.["assign_terms"] &&
        (await current.user?.can(taxonomy.props?.capabilities["assign_terms"]))
      ) {
        await this.syncTerms(postId, tags, taxonomy.name);
      }
    }

    const metaTrx = this.components.get(MetaTrx);
    const metaInput = data.meta_input;
    if (metaInput) {
      for (const [key, value] of Object.entries(metaInput)) {
        await metaTrx.upsert("post", postId, key, value, {
          serialize: typeof value == "object" || Array.isArray(value),
        });
      }
    }

    // Set GUID.
    if (0 >= post.props.guid.length) {
      const linkUtil = this.components.get(LinkUtil);
      trx = await this.database.transaction;
      try {
        await trx
          .table(this.tables.get("posts"))
          .where("ID", postId)
          .update({
            guid: await linkUtil.getPermalink(post),
          });
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to udpate guid - ${e}`);
      }
      await trx.commit();
    }

    if ("attachment" === data.post_type) {
      if (0 < data.file.length) {
        await this.syncAttachedFile(postId, data.file);
      }

      if (0 < data.context.length) {
        await metaTrx.upsert(
          "post",
          postId,
          "_wp_attachment_context",
          data.context
        );
      }
    }

    return postId;
  }

  // wp_delete_post
  async remove(postId: number, force = false) {
    const EMPTY_TRASH_DAYS = this.config.config.constants.EMPTY_TRASH_DAYS;

    const queryUtil = this.components.get(QueryUtil);
    const posts = await queryUtil.posts((query) => {
      query.where("ID", postId);
    });

    if (!posts) {
      return false;
    }

    const post = await this.postUtil.get(postId);

    if (!post.props) {
      return false;
    }

    const postType = post.props.post_type;

    if (
      !force &&
      ("post" === postType || "page" === postType) &&
      "trash" === (await this.postUtil.getStatus(post)) &&
      EMPTY_TRASH_DAYS > 0
    ) {
      return await this.trash(postId);
    }

    if ("attachment" === postType) {
      return await this.removeAttachment(postId, force);
    }

    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.remove("post", {
      objectId: postId,
      key: "_wp_trash_meta_status",
    });
    await metaTrx.remove("post", {
      objectId: postId,
      key: "_wp_trash_meta_time",
    });

    const taxonomyUtil = this.components.get(TaxonomyUtil);
    const taxonomies = await taxonomyUtil.getList({
      objectType: postType,
    });

    const termTrx = this.components.get(TermTrx);
    await termTrx.removeObjectTermRelationships(
      postId,
      taxonomies.map((taxonomy) => taxonomy.name)
    );

    const postTypeObject = this.postUtil.getTypeObject(postType);
    if (postTypeObject?.hierarchical) {
      // Point children of this page to its parent, also clean the cache of affected children.
      const children = await queryUtil.posts((query) => {
        query.where("ID", postId).where("post_type", postType);
      });
      if (children) {
        const trx = await this.database.transaction;
        try {
          await trx
            .table(this.tables.get("posts"))
            .where("post_parent", postId)
            .where("post_type", postType)
            .update({
              post_parent: post.props.post_parent,
            });
        } catch (e) {
          await trx.rollback();
          throw new Error(`Failed to update post - ${e}`);
        }
        await trx.commit();
      }
    }

    const revisionsIds = (
      (await queryUtil.posts((query) => {
        query.where("post_parent", postId).where("post_type", "revision");
      })) ?? []
    ).map((post) => post.ID);

    const revisionTrx = this.components.get(RevisionTrx);
    for (const revisionId of revisionsIds) {
      await revisionTrx.remove(revisionId);
    }

    // Point all attachments to this post up one level.
    let trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("posts"))
        .where("post_parent", postId)
        .where("post_type", "attachment")
        .update({
          post_parent: post.props.post_parent,
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to update attachment - ${e} `);
    }
    await trx.commit();

    const commentIds = (
      (await queryUtil.comments((query) => {
        const { column } = query.alias;
        query
          .where("post_ID", postId)
          .builder.orderBy(column("comments", "comment_ID"), "desc");
      })) ?? []
    ).map((comment) => comment.comment_ID);

    const commentTrx = this.components.get(CommentTrx);
    for (const commentId of commentIds) {
      await commentTrx.remove(commentId, true);
    }

    await metaTrx.removeObject("post", postId);

    trx = await this.database.transaction;
    try {
      await trx.table(this.tables.get("posts")).where("ID", postId).del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to delete post - ${e}`);
    }
    await trx.commit();

    return post;
  }

  // wp_insert_attachment
  async insertAttachment(
    input: Partial<DataUpsert>,
    args?: {
      file?: string;
      parentPostId?: number;
    }
  ) {
    const { file, parentPostId } = args ?? {};
    input = {
      ...input,
      file: file ?? input.file,
      post_parent: parentPostId ?? input.post_parent,
      post_type: "attachment",
    };

    return this.upsert(input);
  }

  // wp_update_attachment_metadata
  async syncAttachmentMetadata(
    postId: number,
    args:
      | {
          data: Record<string, any>;
          remove?: never;
        }
      | {
          data?: never;
          remove: true;
        }
  ) {
    const { data, remove = false } = args;
    const metaTrx = this.components.get(MetaTrx);

    const key = "_wp_attachment_metadata";
    if (true !== remove) {
      await metaTrx.upsert("post", postId, key, data, {
        serialize: true,
      });
    } else {
      await metaTrx.remove("post", {
        objectId: postId,
        key,
      });
    }
  }

  // wp_delete_attachment
  async removeAttachment(postId: number, force = false) {
    const EMPTY_TRASH_DAYS = this.config.config.constants.EMPTY_TRASH_DAYS;
    const MEDIA_TRASH = this.config.config.constants.MEDIA_TRASH;

    const post = await this.postUtil.get(postId);

    if (!post.props || "attachment" == post.props.post_status) {
      return false;
    }

    if (
      !force &&
      EMPTY_TRASH_DAYS > 0 &&
      MEDIA_TRASH &&
      "trash" !== post.props.post_status
    ) {
      return await this.trash(postId);
    }

    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.remove("post", {
      objectId: postId,
      key: "_wp_trash_meta_status",
    });

    await metaTrx.remove("post", {
      objectId: postId,
      key: "_wp_trash_meta_time",
    });

    const queryUtil = this.components.get(QueryUtil);
    // const attachmentMeta = await queryUtil.meta(
    //   "post",
    //   (query) => {
    //     query
    //       .withIds([postId])
    //       .withKeys(["_wp_attachment_metadata"])
    //       .builder.first();
    //   },
    //   val.database.wpPostMeta
    // );

    // const backupSize = await queryUtil.meta(
    //   "post",
    //   (query) => {
    //     query
    //       .withIds([postId])
    //       .withKeys(["_wp_attachment_backup_sizes"])
    //       .builder.first();
    //   },
    //   val.database.wpPostMeta
    // );
    // const file = await this.postUtil.getAttachedFile(postId);

    // wp_delete_object_term_relationships
    const termTrx = this.components.get(TermTrx);
    await termTrx.removeObjectTermRelationships(postId, [
      "category",
      "post_tag",
    ]);
    //await termTrx.syncObject(postId, [], "category");
    //await termTrx.syncObject(postId, [], "post_tag");

    const taxonomyUtil = this.components.get(TaxonomyUtil);
    const taxonomies = await taxonomyUtil.getList({
      objectType: post.props.post_type,
    });

    for (const taxonomy of taxonomies) {
      if (!["category", "post_tag"].includes(taxonomy.name)) {
        await termTrx.removeObjectTermRelationships(postId, [taxonomy.name]);
        ///await termTrx.syncObject(postId, [], taxonomy.name);
      }
    }

    // Delete all for any posts.
    await metaTrx.remove("post", {
      key: "_thumbnail_id",
      value: `${postId}`,
      deleteAll: true,
    });

    const comments =
      (await queryUtil.comments((query) => {
        const { column } = query.alias;
        query
          .where("post_ID", postId)
          .builder.orderBy(column("comments", "comment_ID"), "desc");
      })) ?? [];

    const commentTrx = this.components.get(CommentTrx);
    for (const comment of comments) {
      await commentTrx.remove(comment.comment_ID, true);
    }

    await metaTrx.removeObject("post", postId);

    const trx = await this.database.transaction;

    try {
      await trx.table(this.tables.get("posts")).where("ID", postId).del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to delete post - ${e}`);
    }
    await trx.commit();

    // wp_delete_attachment_files

    return post;
  }

  // wp_untrash_post
  async untrash(postId: number) {
    const post = await this.postUtil.get(postId);

    if (!post.props || "trash" !== post.props.post_status) {
      return false;
    }

    const previousStatus = await post.meta.get<string>("_wp_trash_meta_status");

    const newStatus =
      "attachment" === post.props.post_type
        ? "inherit"
        : previousStatus
        ? previousStatus
        : "draft";

    const metaTrx = this.components.get(MetaTrx);

    await metaTrx.remove("post", {
      objectId: postId,
      key: "_wp_trash_meta_status",
    });

    await metaTrx.remove("post", {
      objectId: postId,
      key: "_wp_trash_meta_time",
    });

    const postUpdated = await this.upsert({
      ID: postId,
      post_status: newStatus,
    });

    if (!postUpdated) {
      return false;
    }

    await this.untrashComments(post);

    return post;
  }

  // wp_untrash_post_comments
  async untrashComments(postIdOrPost: number | Post) {
    let post: Post;
    if (typeof postIdOrPost == "number") {
      post = await this.postUtil.get(postIdOrPost);
    } else {
      post = postIdOrPost;
    }

    if (!post.props) {
      return false;
    }

    const postId = post.props.ID;

    const commentStatuses = await post.meta.get<Record<number, any>>(
      "_wp_trash_meta_comments_status"
    );

    if (!commentStatuses) {
      return true;
    }

    const groupByStatus = new Map<string, number[]>();
    for (const [k, v] of Object.entries(commentStatuses)) {
      groupByStatus.set(`${v}`, [
        ...(groupByStatus.get(`${v}`) ?? []),
        parseInt(k),
      ]);
    }

    for (const [k, v] of groupByStatus.entries()) {
      const trx = await this.database.transaction;

      try {
        await trx
          .table(this.tables.get("comments"))
          .whereIn("comment_ID", v)
          .update({
            comment_approved: k,
          });
      } catch (e) {
        trx.rollback();
        throw new Error(`Failed to update post comments - ${e}`);
      }
      await trx.commit();
    }

    const metaTrx = this.components.get(MetaTrx);

    await metaTrx.remove("post", {
      objectId: postId,
      key: "_wp_trash_meta_comments_status",
    });

    return true;
  }

  // wp_trash_post
  async trash(postId: number) {
    const EMPTY_TRASH_DAYS = this.config.config.constants.EMPTY_TRASH_DAYS;

    const post = await this.postUtil.get(postId);

    if (!post.props || "trash" == post.props.post_status) {
      return undefined;
    }

    if (!EMPTY_TRASH_DAYS) {
      await this.remove(postId);
      return post;
    }

    const previousStatus = post.props.post_status;

    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.upsert(
      "post",
      postId,
      "_wp_trash_meta_status",
      previousStatus
    );

    await metaTrx.upsert(
      "post",
      postId,
      "_wp_trash_meta_time",
      currentUnixTimestamp()
    );

    const postUpdated = await this.upsert({
      ID: postId,
      post_status: "trash",
    });

    if (!postUpdated) {
      return undefined;
    }

    await this.trashComments(postId);
    return post;
  }

  // wp_trash_post_comments
  async trashComments(postOrId: Post | number) {
    const post =
      typeof postOrId == "number"
        ? await this.postUtil.get(postOrId)
        : postOrId;

    if (!post?.props) {
      return false;
    }

    const postId = post.props.ID;
    const queryUtil = this.components.get(QueryUtil);
    const comments = await queryUtil.comments(
      (query) => {
        query.where("post_ID", postId);
      },
      z.array(
        val.database.wpComments.pick({
          comment_ID: true,
          comment_approved: true,
        })
      )
    );

    if (!comments) {
      return false;
    }

    const statuses: Record<number, any> = {};
    comments.forEach((comments) => {
      statuses[comments.comment_ID] = comments.comment_approved;
    });

    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.upsert(
      "post",
      postId,
      "_wp_trash_meta_comments_status",
      statuses,
      {
        serialize: true,
      }
    );

    // Set status for all comments to post-trashed.
    const trx = await this.database.transaction;
    let result: number = 0;

    try {
      await trx
        .table(this.tables.get("comments"))
        .where("comment_post_ID", postId)
        .update({
          comment_approved: "post-trashed",
        })
        .then((v) => {
          result = v;
        });
    } catch (e) {
      trx.rollback();
      throw new Error(`Failed to update post comments - ${e}`);
    }
    await trx.commit();

    return result;
  }

  // update_attached_file
  async syncAttachedFile(postId: number, file: string) {
    const post = await this.postUtil.get(postId);

    if (!post.props) {
      return;
    }

    const staticAssetsPath = this.config.config.staticAssetsPath;
    file = file
      .replace(new RegExp(`^${staticAssetsPath}`), "")
      .replace(/^\/+/, "");

    const metaTrx = this.components.get(MetaTrx);
    if (file.length > 0) {
      await metaTrx.upsert("post", postId, "_wp_attached_file", file);
    } else {
      await metaTrx.remove("post", {
        objectId: postId,
        key: "_wp_attached_file",
      });
    }
  }

  // wp_set_post_categories
  async syncCategories(
    postId: number,
    namesOrTermIds: (string | number)[],
    append = false
  ) {
    const post = await this.postUtil.get(postId);

    if (!post.props) {
      return;
    }

    if (0 >= namesOrTermIds.length) {
      const taxonomy = await this.taxonomyUtil.get("category");
      if (!taxonomy.props?.default_term) {
        return;
      }

      if ("auto-draft" !== post.props.post_status) {
        namesOrTermIds = [taxonomy.props?.default_term];
      }
    }

    const termTrx = this.components.get(TermTrx);
    return await termTrx.syncObject(postId, namesOrTermIds, "category", append);
  }

  async syncTerms(
    postId: number,
    slugsOrTermIds: (string | number)[],
    taxonomyName: types.TaxonomyName = "post_tag",
    append = false
  ) {
    const post = await this.postUtil.get(postId);

    if (!post.props) {
      return;
    }

    /*
     * Hierarchical taxonomies must always pass IDs rather than names so that
     * children with the same names but different parents aren't confused.
     */
    if (await this.taxonomyUtil.isHierarchical(taxonomyName)) {
      slugsOrTermIds = slugsOrTermIds.map((slugOrTermId) =>
        typeof slugOrTermId == "string" ? parseInt(slugOrTermId) : slugOrTermId
      );
    }

    const termTrx = this.components.get(TermTrx);
    return await termTrx.syncObject(
      postId,
      slugsOrTermIds,
      taxonomyName,
      append
    );
  }
}
