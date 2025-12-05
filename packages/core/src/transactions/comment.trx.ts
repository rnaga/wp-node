import { z } from "zod";

import { currentUnixTimestamp, formatting } from "../common";
import { Config } from "../config";
import { Comment } from "../core/comment";
import { Components } from "../core/components";
import { Logger } from "../core/logger";
import { CommentUtil } from "../core/utils/comment.util";
import { DateTimeUtil } from "../core/utils/date-time.util";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { MetaTrx } from "./meta.trx";
import { Trx } from "./trx";

type DataUpsert = z.infer<typeof val.trx.commentUpsert>;

@transactions()
export class CommentTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private config: Config,
    private components: Components
  ) {
    super(components);
  }
  // wp_insert_comment
  async upsert(input: Partial<DataUpsert>) {
    const commentUtil = this.components.get(CommentUtil);

    let update = false;
    let commentBefore: Comment | undefined = undefined;

    if (input.comment_ID && 0 < input.comment_ID) {
      update = true;
      commentBefore = await commentUtil.get(input.comment_ID);

      if (!commentBefore || !commentBefore.props) {
        throw new Error(`Comment not found - ${input.comment_ID}`);
      }

      input = {
        ...commentBefore.props,
        comment_meta: await commentBefore.meta.props(),
        ...input,
      };
    }

    // If comment type is "note", it can allow empty content.
    const parsedInput =
      input.comment_type === "note"
        ? val.trx.commentUpsert
            .extend({
              comment_content: z.string().optional().default(""),
            })
            .parse(input)
        : val.trx.commentUpsert.parse(input);
    const dateTimeUtil = this.components.get(DateTimeUtil);
    const dateTime = dateTimeUtil.get();

    parsedInput.comment_date = dateTime.mySQLDatetime;
    parsedInput.comment_date_gmt = dateTime.mySQLGMTDatetime;

    let dataUpsert: any = {};
    const validator = this.components.get(Validator);
    try {
      dataUpsert = validator.execAny(
        update ? val.trx.commentUpdate : val.trx.commentInsert,
        Object.entries(parsedInput)
          .map(([key, value]) => ({
            [key]: formatting.unslash(value),
          }))
          .reduce((obj, item) => ({ ...obj, ...item }), {})
      );
    } catch (e) {
      this.logger.info(`parse error: ${e}`, { parsedInput });
      throw e;
    }

    if (!dataUpsert) {
      throw new Error(`Invalid post data - ${JSON.stringify(parsedInput)}`);
    }

    let commentId = parsedInput.comment_ID ?? 0;

    const trx = await this.database.transaction;
    try {
      if (update) {
        await trx
          .table(this.tables.get("comments"))
          .where("comment_ID", parsedInput.comment_ID)
          .update(dataUpsert);
      } else {
        await trx
          .insert(dataUpsert)
          .into(this.tables.get("comments"))
          .then((v) => {
            commentId = v[0];
          });
      }
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert user - ${e}`);
    }
    await trx.commit();

    const comment = await commentUtil.get(commentId);

    if (!comment.props?.comment_ID) {
      throw new Error(`Comment not found - ${commentId}`);
    }

    if (parsedInput.comment_meta) {
      const metaTrx = this.components.get(MetaTrx);
      for (const [key, value] of Object.entries(parsedInput.comment_meta)) {
        if (!value) {
          continue;
        }
        await metaTrx.upsert("comment", commentId, key, value, {
          serialize: typeof value == "object" || Array.isArray(value),
        });
      }
    }

    if (
      comment.props.comment_approved == "1" &&
      parsedInput.comment_post_ID > 0
    ) {
      await this.updateCount(parsedInput.comment_post_ID);
    }

    return commentId;
  }

  async updateCount(postId: number, forceCount: number = -1) {
    const postUtil = this.components.get(PostUtil);
    const post = await postUtil.get(postId);

    if (!post.props) {
      throw new Error(`Post not found - ${postId}`);
    }

    const queryUtil = this.components.get(QueryUtil);
    const counts = await queryUtil.comments((query) => {
      query.countApproved(postId);
    }, z.array(z.object({ count: z.number() })));

    const count = counts ? counts[0].count : 0;

    const trx = await this.database.transaction;

    try {
      await trx
        .table(this.tables.get("posts"))
        .where("ID", postId)
        .update({
          comment_count: forceCount > 0 ? forceCount : count,
        });
    } catch (e) {
      trx.rollback();
      throw new Error(`Failed to update count - ${e}`);
    }
    await trx.commit();
    return true;
  }

  // wp_delete_comment
  async remove(commentId: number, force = false): Promise<boolean> {
    const EMPTY_TRASH_DAYS = this.config.config.constants.EMPTY_TRASH_DAYS;
    const queryUtil = this.components.get(QueryUtil);
    const commentUtil = this.components.get(CommentUtil);

    const comment = await queryUtil.comments((query) => {
      query.where("ID", commentId).builder.first();
    }, val.database.wpComments);

    if (!comment) {
      return false;
    }

    const commentStatus = await commentUtil.getStatusAsString(
      comment.comment_ID
    );
    if (
      !force &&
      EMPTY_TRASH_DAYS &&
      typeof commentStatus == "string" &&
      ["trash", "spam"].includes(commentStatus)
    ) {
      return await this.trash(commentId);
    }

    // Move children up a level.
    const children = await queryUtil.comments((query) => {
      query.where("parent", commentId);
    });

    if (children) {
      const trx = await this.database.transaction;
      try {
        await trx
          .table(this.tables.get("comments"))
          .where("comment_parent", commentId)
          .update({
            comment_parent: comment.comment_parent,
          });
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to update comment parent - ${commentId}`);
      }
      await trx.commit();
    }

    // Delete metadata.
    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.removeObject("comment", commentId);

    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("comments"))
        .where("comment_ID", commentId)
        .del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to delete comment - ${e}`);
    }
    await trx.commit();
    return true;
  }

  // wp_trash_comment
  async trash(commentId: number): Promise<boolean> {
    const EMPTY_TRASH_DAYS = this.config.config.constants.EMPTY_TRASH_DAYS;

    if (!EMPTY_TRASH_DAYS) {
      const commentUtil = this.components.get(CommentUtil);
      const comment = await commentUtil.get(commentId);
      const commentChildren = await comment.children();

      // First remove the comment itself (parent)
      let success = await this.remove(commentId, true);

      // Check if comment is note type and it's parent comment,
      // then remove children too (since WP 6.9)
      if (
        comment.props?.comment_type === "note" &&
        0 === comment.props.comment_parent
      ) {
        for (const child of commentChildren || []) {
          success = success && (await this.remove(child.comment_ID, true));
        }
      }

      return success;
    }

    const queryUtil = this.components.get(QueryUtil);
    const comment = await queryUtil.comments((query) => {
      query.where("ID", commentId).builder.first();
    }, val.database.wpComments);

    if (!comment) {
      return false;
    }

    const result = await this.updateStatus(commentId, "trash");

    if (!result) {
      return false;
    }
    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.upsert(
      "comment",
      commentId,
      "_wp_trash_meta_status",
      comment.comment_approved
    );
    await metaTrx.upsert(
      "comment",
      commentId,
      "_wp_trash_meta_time",
      currentUnixTimestamp()
    );

    let success = true;

    // Check if comment is note type and its parent comment
    if (comment.comment_type === "note" && 0 === comment.comment_parent) {
      const commentUtil = this.components.get(CommentUtil);
      const comment = await commentUtil.get(commentId);
      const commentChildren = await comment.children();

      for (const child of commentChildren || []) {
        success = success && (await this.trash(child.comment_ID));
      }
    }

    return success;
  }

  // wp_set_comment_status
  async updateStatus(
    commentId: number,
    commentStatus: "hold" | "0" | "approve" | "1" | "spam" | "trash"
  ) {
    const commentUtil = this.components.get(CommentUtil);
    let status = "";
    switch (commentStatus) {
      case "hold":
      case "0":
        status = "0";
        break;
      case "approve":
      case "1":
        status = "1";
        break;
      case "spam":
      case "trash":
        status = commentStatus;
        break;
      default:
        return false;
    }

    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("comments"))
        .where("comment_ID", commentId)
        .update({
          comment_approved: status,
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to update comment status - ${e}`);
    }
    await trx.commit();

    const comment = await commentUtil.get(commentId);

    if (!comment.props) {
      throw new Error(`Comment not found - ${commentId}`);
    }

    await this.updateCount(comment.props.comment_post_ID);

    return true;
  }
}
