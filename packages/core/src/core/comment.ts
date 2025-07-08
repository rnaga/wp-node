import { z } from "zod";

import { Scope } from "../constants/";
import { asyncInit } from "../decorators/async-init";
import { component } from "../decorators/component";
import * as val from "../validators";
import { undefinedIfEmptyString } from "../validators/helpers";
import { Meta } from "./meta";
import { QueryUtil } from "./utils/query.util";

import type * as types from "../types";
import { Logger } from "./logger";

@component({ scope: Scope.Transient })
export class Comment {
  constructor(
    public meta: Meta,
    private logger: Logger,
    private queryUtil: QueryUtil,
    private commentId: number,
    private _props: types.Tables["comments"]
  ) {
    this.meta.set("comment", commentId);
  }

  get props() {
    return !this._props ? undefined : this._props;
  }

  withProps(props: Partial<types.Tables["comments"]>) {
    this._props = { ...this._props, ...props };
    return this;
  }

  async post() {
    if (!this.props?.comment_post_ID) {
      return undefined;
    }
    const postId = this.props?.comment_post_ID;
    return await this.queryUtil.posts((query) => {
      query.where("ID", postId).builder.first();
    }, val.database.wpPosts);
  }

  async user() {
    if (!this.props?.user_id) {
      return undefined;
    }

    const userId = this.props.user_id;
    return await this.queryUtil.users((query) => {
      query.where("ID", userId).builder.first();
    }, val.database.wpUsers);
  }

  async parent() {
    if (!this.props?.comment_parent) {
      return undefined;
    }

    const commentParentId = this.props?.comment_parent;
    const results = await this.queryUtil.comments(
      (query) => {
        query
          .where("ID", commentParentId)
          .withUsers([], "left")
          .select(["*", "user_display_name"])
          .builder.first();
      },
      val.database.wpComments.merge(
        z.object({
          display_name: val.database.wpUsers.shape.display_name
            .nullable()
            .transform(undefinedIfEmptyString),
        })
      )
    );

    return results;
  }

  async children(limit: number = 99) {
    if (!this.props?.comment_ID) {
      return undefined;
    }

    const commentParentId = this.props?.comment_ID;
    return await this.queryUtil.comments(
      (query) => {
        query
          .withChildren("comment_parent", [commentParentId], limit)
          .withUsers([], "left")
          .select(["*", "parent", "user_display_name"]);
      },
      z
        .array(
          val.query.schemaDepth.merge(
            val.database.wpComments.merge(
              z.object({
                display_name: val.database.wpUsers.shape.display_name
                  .nullable()
                  .transform(undefinedIfEmptyString),
              })
            )
          )
        )
        .nonempty()
    );
  }

  async countChildren() {
    if (!this.props?.comment_ID) {
      return undefined;
    }

    const commentParentId = this.props?.comment_ID;
    const result = await this.queryUtil.comments(
      (query) => {
        query
          .withChildren("comment_parent", [commentParentId], 0)
          .builder.count(`* as count`);
      },
      z.array(
        z.object({
          count: z.number(),
          depth: z.number(),
        })
      )
    );

    return !result
      ? 0
      : result?.reduce((count, comment) => count + comment.count, 0);
  }

  @asyncInit
  private async init() {
    if (!this.commentId) {
      throw new Error("comment Id not defined");
    }

    const comment = await this.queryUtil.comments((query) => {
      query.get(this.commentId);
    }, val.database.wpComments);

    if (!comment) {
      this.logger.info(`Comment not found: ${this.commentId}`);
      return;
    }
    this._props = comment;
  }
}
