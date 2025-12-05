import { z } from "zod";

import { formatting } from "../common";
import { diffObject } from "../common/diff";
import { Comment } from "../core/comment";
import { Components } from "../core/components";
import { Options } from "../core/options";
import { Post } from "../core/post";
import { CommentUtil } from "../core/utils/comment.util";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { component } from "../decorators/component";
import { CommentsQuery } from "../query-builder";
import { CommentTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

import type * as types from "../types";
type DataUpsert = z.infer<typeof val.trx.commentUpsert>;

type DataBaseType = {
  comment_parent: number;
  post_comment_count: number;
  post_title: string;
  post_type: string;
  post_guid: string;
  post_author: number;
  post_status: string;
  user_display_name?: string;
  parent_comment_author?: string;
  parent_user_display_name?: string;
  parent_user_id: number;
  children?: Awaited<ReturnType<InstanceType<typeof Comment>["children"]>>;
  count_children: number;
};

type DataType<T extends "view" | "edit" | "embed"> = T extends "edit"
  ? DataBaseType &
      Comment["props"] & {
        metas: Record<string, any>;
      }
  : DataBaseType & {
      comment_ID: number;
      comment_post_ID: number;
      comment_author: string;
      comment_date: string;
      comment_date_gmt: string;
      comment_content: string;
      comment_approved: string;
      comment_type: string;
      user_id: number;
    };

@component()
export class CommentCrud extends Crud {
  constructor(
    components: Components,
    private commentUtil: CommentUtil,
    private postUtil: PostUtil
  ) {
    super(components);
  }

  private async canReadPostComment(post: Post, password?: string) {
    if (!post.props) {
      return false;
    }
    const { user } = await this.getUser();
    const postType = this.postUtil.getTypeObject(post.props?.post_type);

    if (!postType) {
      return false;
    }

    return (
      this.checkPasswordProtectedPost(post.props, password ?? "") ||
      (await this.canReadPost(post.props)) ||
      (await user.can("edit_post", post.props?.ID))
    );
  }

  private async canRead(comment: Comment) {
    const { user } = await this.getUser();

    if (!user.props) {
      return false;
    }

    if (comment.props?.comment_post_ID) {
      const post = await this.postUtil.get(comment.props.comment_post_ID);
      if (
        post.props &&
        (await this.canReadPost(post.props)) &&
        `${comment.props.comment_approved}` == "1"
      ) {
        return true;
      }
    }

    if (
      !comment.props?.comment_post_ID &&
      !(await user.can("moderate_comments"))
    ) {
      return false;
    }

    if (comment.props?.user_id && user.props.ID === comment.props.user_id) {
      return true;
    }

    return (
      comment.props?.comment_ID &&
      (await user.can("edit_comment", comment.props.comment_ID))
    );
  }

  private async canEdit(commentId: number) {
    if (!(await this.commentUtil.get(commentId)).props) {
      return false;
    }

    const { user } = await this.getUser();
    const role = await user.role();

    if (role.is("anonymous")) {
      return false;
    }

    return (
      (await user.can("moderate_comments")) ||
      (await user.can("edit_comment", commentId))
    );
  }

  private async formReturnData<T extends "view" | "edit" | "embed">(
    comment: Comment,
    context: T,
    options?: {
      limitChildren?: number;
    }
  ): Promise<DataType<T>> {
    const { limitChildren = 99 } = options ?? {};
    const props = comment.props as types.WpComments;
    const parentComment = await comment.parent();
    const user = await comment.user();
    const post = await comment.post();
    const children = await comment.children(limitChildren);
    const countChildren = await comment.countChildren();

    if ("edit" === context) {
      return {
        ...props,
        post_comment_count: post?.comment_count,
        post_title: post?.post_title,
        post_type: post?.post_type,
        post_guid: post?.guid,
        user_display_name: user?.display_name,
        parent_comment_author: parentComment?.comment_author,
        parent_user_display_name: parentComment?.display_name,
        parent_user_id: parentComment?.user_id,
        children,
        count_children: countChildren,
        metas: await comment.meta.props(),
      } as DataType<T>;
    } else {
      return {
        comment_ID: props.comment_ID,
        comment_post_ID: props.comment_post_ID,
        comment_author: props.comment_author,
        comment_author_email: props.comment_author_email,
        comment_date: props.comment_date,
        comment_date_gmt: props.comment_date_gmt,
        comment_content: props.comment_content,
        comment_parent: props.comment_parent,
        comment_approved: props.comment_approved,
        comment_type: props.comment_type,
        post_comment_count: post?.comment_count,
        post_title: post?.post_title,
        post_type: post?.post_type,
        post_guid: post?.guid,
        post_author: post?.post_author,
        post_status: post?.post_status,
        parent_comment_author: parentComment?.comment_author,
        parent_user_id: parentComment?.user_id,
        parent_user_display_name: parentComment?.display_name,
        user_id: props.user_id,
        user_display_name: user?.display_name,
        children,
        count_children: countChildren,
      } as DataType<T>;
    }
  }

  async getAsUpsert(commentId: number) {
    const comment = (await this.get(commentId, { context: "edit" })).data;
    return this.returnValue(val.trx.commentUpsert.parse(comment));
  }

  async get<T extends "view" | "edit" | "embed">(
    commentId: number,
    options?: Partial<{
      context: T;
      password: string;
    }>
  ) {
    const { password = "", context = "view" } = options ?? {};

    const comment = await this.commentUtil.get(commentId);
    if (!comment.props) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Comment not found");
    }

    const { user } = await this.getUser();

    // If comment type is "note", then only allow users who can "edit_comment"
    if (
      comment.props.comment_type === "note" &&
      !(await user.can("edit_comment", comment.props.comment_ID))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to read this comment"
      );
    }

    if (context == "edit" && !(await user.can("moderate_comments"))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit comments"
      );
    }

    if (!(await this.canRead(comment))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to read comments"
      );
    }

    const post = await this.postUtil.get(comment.props.comment_post_ID);

    if (post.props && !(await this.canReadPostComment(post, password))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to read the post for this comment"
      );
    }

    return this.returnValue(
      (await this.formReturnData(comment, context)) as DataType<T>
    );
  }

  async create(
    data: Partial<DataUpsert>,
    options?: Partial<{
      remoteIp: string;
    }>
  ) {
    const { remoteIp } = options ?? {};

    const { user, userId } = await this.getUser();
    const role = await user.role();

    if (role.is("anonymous") || !user.props) {
      const options = this.components.get(Options);
      if (
        (await options.get("comment_registration")) ||
        // Don't allow anonymous users to create notes (since WP 6.9)
        data.comment_type === "note"
      ) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "Sorry, you must be logged in to comment"
        );
      }
    }

    // Limit who can set comment `author`, `author_ip` or `status` to anything other than the default.
    if (
      data.user_id &&
      userId !== data.user_id &&
      (await user.can("moderate_comments"))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this comment"
      );
    }

    if (
      data.comment_author_IP &&
      !(await user.can("moderate_comments")) &&
      (!remoteIp || data.comment_author_IP !== remoteIp)
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this comment"
      );
    }

    if (data.comment_approved && !(await user.can("moderate_comments"))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this comment"
      );
    }

    if (!data.comment_post_ID) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to create this comment without a post"
      );
    }

    const postUtil = this.components.get(PostUtil);
    const post = await postUtil.get(data.comment_post_ID);

    // Check for notes
    const isNote = data.comment_type === "note";
    if (isNote && !(await user.can("edit_post", data.comment_post_ID))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to create a note on this post"
      );
    }

    if (
      !post.props ||
      (!isNote && "draft" === post.props.post_status) ||
      "trash" === post.props.post_status ||
      !this.canReadPostComment(post) ||
      (!this.commentUtil.isOpen(post) && !isNote)
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to create a comment on this post"
      );
    }

    if (data.comment_ID) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Cannot create existing comment"
      );
    }

    // Do not allow comments to be created with a non-default type or note.
    if (
      data.comment_type &&
      data.comment_type?.length > 0 &&
      "comment" !== data.comment_type &&
      "note" !== data.comment_type
    ) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Cannot create a comment with that type"
      );
    }

    // Dont allow empty comment unless "_wp_note_status" meta is set
    // and comment type is note
    const noteMetaStatus = data.comment_meta?.["_wp_note_status"];
    const isNoteMetaAllowed =
      data.comment_type === "note" &&
      (noteMetaStatus === "resolved" || noteMetaStatus === "reopen");

    if (
      !isNoteMetaAllowed &&
      (!data.comment_content || data.comment_content == "")
    ) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid comment content");
    }

    // Set author data if the user's logged in.
    if (
      user.props &&
      0 >=
        (
          [
            "user_id",
            "comment_author",
            "comment_author_email",
            "comment_author_url",
          ] as const
        ).filter((k) => data[k] && (data[k]?.toString() ?? "").length > 0)
          .length
    ) {
      data = {
        ...data,
        user_id: user.props.ID,
        comment_author: user.props.display_name,
        comment_author_email: user.props.user_email,
        comment_author_url: user.props.user_url,
      };
    }

    // Honor the discussion setting that requires a name and email address of the comment author.
    const optionsCore = this.components.get(Options);
    if (
      (!data.comment_author_email || 0 >= data.comment_author_email.length) &&
      (!data.comment_author || 0 >= data.comment_author.length) &&
      (await optionsCore.get("require_name_email"))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Creating a comment requires valid author name and email values."
      );
    }

    // Don't check for duplicates or flooding for notes.
    data.comment_approved =
      "note" === data.comment_type
        ? "1"
        : await this.commentUtil.getStatus(data);

    const commentTrx = this.components.get(CommentTrx);
    return this.returnValue(await commentTrx.upsert(data));
  }

  async update(commentId: number, data: Partial<DataUpsert>) {
    if (!(await this.canEdit(commentId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this comment"
      );
    }

    data.comment_ID = commentId;

    const currentComment = (await this.getAsUpsert(commentId)).data;

    if (currentComment.comment_type !== data.comment_type) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to change the comment type"
      );
    }

    const diffData = diffObject(data, currentComment) as Partial<DataUpsert>;
    const postId = diffData.comment_post_ID ?? currentComment.comment_post_ID;

    if (postId && postId > 0) {
      const post = await this.postUtil.get(postId);
      if (!post.props) {
        throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid post ID");
      }
    }

    const commentTrx = this.components.get(CommentTrx);
    return this.returnValue(await commentTrx.upsert(data));
  }

  async delete(commentId: number, force: boolean = false) {
    if (!(await this.canEdit(commentId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to delete this comment"
      );
    }

    const commentTrx = this.components.get(CommentTrx);
    return this.returnValue(await commentTrx.remove(commentId, force));
  }

  async list<T extends "view" | "edit" | "embed">(
    args?: Partial<z.infer<typeof val.crud.commentListParams>>,
    options?: { context?: T; password?: string; limitChildren?: number }
  ) {
    const { context = "view", password, limitChildren } = options ?? {};
    const { user } = await this.getUser();
    const queryUtil = this.components.get(QueryUtil);
    const parsedArgs = val.crud.commentListParams.parse(args ?? {});

    if (parsedArgs.post) {
      for (const postId of parsedArgs.post) {
        const post = await this.postUtil.get(postId);
        if (
          !post.props ||
          !(await this.canReadPost(post.props)) ||
          !(await this.canReadPostComment(post, password))
        ) {
          throw new CrudError(
            StatusMessage.UNAUTHORIZED,
            "Sorry, you are not allowed to read the post for this comment"
          );
        }
      }
    }

    if (context == "edit" && !(await user.can("moderate_comments"))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit comments"
      );
    }

    if (!(await user.can("edit_posts"))) {
      const protectedParams = [
        "author",
        "author_exclude",
        "author_email",
        "type",
        "status",
      ] as const;
      for (const param of protectedParams) {
        switch (param) {
          case "status":
            if ("approve" !== parsedArgs[param]) {
              throw new CrudError(
                StatusMessage.UNAUTHORIZED,
                "Query parameter not permitted"
              );
            }
            break;
          case "type":
            if ("comment" !== parsedArgs[param]) {
              throw new CrudError(
                StatusMessage.UNAUTHORIZED,
                "Query parameter not permitted"
              );
            }
            break;
          default:
            if (parsedArgs[param]) {
              throw new CrudError(
                StatusMessage.UNAUTHORIZED,
                `Query parameter not permitted - ${param} ${parsedArgs[param]}`
              );
            }
            break;
        }
      }
    }

    const buildQuery = (query: CommentsQuery) => {
      const { column } = query.alias;
      const offset = (parsedArgs.page - 1) * parsedArgs.per_page;
      const limit = parsedArgs.per_page;

      query.builder
        .offset(offset)
        .limit(limit)
        .groupBy(column("comments", "comment_ID"));

      if (parsedArgs.orderby) {
        query.builder.orderBy(
          column("comments", parsedArgs.orderby),
          parsedArgs.order
        );
      }

      if (parsedArgs.search) {
        query.andWhere((query) => {
          const searchColumns = [
            "author",
            "author_email",
            "author_url",
            "author_IP",
            "content",
          ] as const;
          for (const searchColumn of searchColumns) {
            parsedArgs.search &&
              query.or.whereLike(searchColumn, parsedArgs.search);
          }
        });
      }

      for (const key of Object.keys(parsedArgs) as Array<
        keyof typeof parsedArgs
      >) {
        const value = parsedArgs[key];
        if (!value) continue;

        switch (key) {
          case "after":
          case "before":
            query.where(
              "date",
              formatting.dateMySQL(value),
              key == "after" ? ">=" : "<="
            );
            break;

          case "author":
            query.whereIn("user_id", value as number[]);
            break;

          case "author_exclude":
            query.andWhereNot((query) =>
              query.whereIn("user_id", value as number[])
            );
            break;

          case "author_email":
            query.where("author_email", value);
            break;

          case "include":
            query.whereIn("ID", value as number[]);
            break;

          case "exclude":
            query.andWhereNot((query) =>
              query.whereIn("ID", value as number[])
            );
            break;

          case "parent":
            query.whereIn("parent", value as number[]);
            break;

          case "parent_exclude":
            query.andWhereNot((query) =>
              query.whereIn("parent", value as number[])
            );
            break;

          case "post":
            query.whereIn("post_ID", value as number[]);
            break;

          case "type":
            query.where("type", value);
            break;
          case "status":
            query.whereIn(
              "approved",
              value == "approve" ? ["1", "approve"] : [`${value}`]
            );
            break;
        }
      }
    };

    const comments =
      (await queryUtil.comments((query) => {
        buildQuery(query);
      })) ?? [];

    const counts = await queryUtil.comments((query) => {
      buildQuery(query);
      query.count("comments", "comment_ID");
    }, val.query.resultCount);

    const data = [];
    for (const comment of this.commentUtil.toComments(comments)) {
      data.push(await this.formReturnData(comment, context, { limitChildren }));
    }

    const pagination = this.pagination({
      page: parsedArgs.page,
      limit: parsedArgs.per_page,
      count: counts?.count ?? 0,
    });

    return this.returnValue(data as DataType<T>[], { pagination });
  }
}
