import { z } from "zod";

import { formatting } from "../common/formatting";
import { Scope } from "../constants";
import { component } from "../decorators/component";
import * as val from "../validators";
import { QueryUtil } from "./utils/query.util";

import type * as types from "../types";

@component({ scope: Scope.Transient })
export class Meta {
  constructor(
    private queryUtil: QueryUtil,
    private table: types.MetaTable,
    private id: number,
    private _props: Record<string, any>
  ) {
    this._props = {};
  }

  set(table: types.MetaTable, id: number) {
    this.table = table;
    this.id = id;
    return this;
  }

  setProps(props: Record<string, any>) {
    this._props = props;
  }

  async get<T = any>(key: string) {
    if (!this._props[key]) {
      this._props = await this.props();
    }
    return this._props[key] as T | undefined;
  }

  private async post() {
    return (
      (await this.queryUtil.posts((query) => {
        query.withMeta("inner").where("ID", this.id);
      }, z.array(val.database.wpPostMeta))) ?? []
    );
  }

  private async comment() {
    return (
      (await this.queryUtil.comments((query) => {
        query.withMeta("inner").where("ID", this.id);
      }, z.array(val.database.wpCommentMeta))) ?? []
    );
  }

  private async site() {
    return (
      (await this.queryUtil.sites((query) => {
        query.withMeta("inner").where("id", this.id);
      }, z.array(val.database.wpSiteMeta))) ?? []
    );
  }

  private async blog() {
    return (
      (await this.queryUtil.blogs((query) => {
        query.withMeta("inner").where("blog_id", this.id);
      }, z.array(val.database.wpBlogMeta))) ?? []
    );
  }

  private async term() {
    return (
      (await this.queryUtil.terms((query) => {
        query.withMeta("inner").where("term_id", this.id);
      }, z.array(val.database.wpTermMeta))) ?? []
    );
  }

  private async user() {
    return (
      (await this.queryUtil.users((query) => {
        query.withMeta("inner").where("ID", this.id);
      }, z.array(val.database.wpUserMeta))) ?? []
    );
  }

  async props() {
    const result = await this[this.table]();

    result.forEach((meta) => {
      if (typeof meta.meta_key !== "string" || 0 >= meta.meta_key.length) {
        return;
      }

      this._props[meta.meta_key] = formatting.primitive(meta.meta_value);
    });

    return this._props;
  }
}
