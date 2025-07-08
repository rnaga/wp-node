/* eslint-disable no-case-declarations */

import { component } from "../../decorators/component";
import { Components } from "../components";
import { Meta } from "../meta";
import { CommentUtil } from "./comment.util";
import { PostUtil } from "./post.util";
import { TermUtil } from "./term.util";
import { UserUtil } from "./user.util";

import type * as types from "../../types";

@component()
export class MetaUtil {
  constructor(private components: Components) {}

  get(table: types.MetaTable, id: number) {
    return this.components.get(Meta, [table, id]);
  }

  async getValue<T = string>(table: types.MetaTable, id: number, key: string) {
    return await this.get(table, id).get<T>(key);
  }

  // https://github.com/WordPress/WordPress/blob/master/wp-includes/meta.php
  // is_protected_meta
  isProtected(
    metaKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metaType?: types.MetaTable
  ) {
    const sanitizedKey = metaKey.replace(/[^\x20-\x7E\p{L}]/gu, "");
    const protectedKey = sanitizedKey.length > 0 && sanitizedKey[0] === "_";

    // @todo: add hook
    return protectedKey;
  }

  // https://github.com/WordPress/WordPress/blob/master/wp-includes/meta.php
  // get_object_subtype
  async getObjectSubtype(type: string, id: number): Promise<string>;
  async getObjectSubtype(
    type: "post" | "comment" | "term" | "user",
    id: number
  ): Promise<string>;
  async getObjectSubtype(type: any, id: number) {
    let subType: string | undefined = undefined;

    switch (type) {
      case "post":
        const postUtil = this.components.get(PostUtil);
        const post = await postUtil.get(id);
        subType = post.props?.post_type;
        break;

      case "term":
        const termUtil = this.components.get(TermUtil);
        const term = await termUtil.get(id);
        subType = term.props?.taxonomy;
        break;

      case "comment":
        const commentUtil = this.components.get(CommentUtil);
        const comment = await commentUtil.get(id);
        subType = comment.props?.comment_ID ? "comment" : undefined;
        break;

      case "user":
        const userUtil = this.components.get(UserUtil);
        const user = await userUtil.get(id);
        subType = user.props?.ID ? "user" : undefined;
        break;
    }
    return subType;
  }
}
