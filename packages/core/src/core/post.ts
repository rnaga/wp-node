import { z } from "zod";

import { Scope } from "../constants/";
import { asyncInit } from "../decorators/async-init";
import { component } from "../decorators/component";
import * as val from "../validators";
import { Logger } from "./logger";
import { Meta } from "./meta";
import { QueryUtil } from "./utils/query.util";

import type * as types from "../types";
type Props = types.Tables["posts"];

@component({ scope: Scope.Transient })
export class Post {
  // Optional. Type of filter to apply. Accepts 'raw', 'edit', 'db',
  // or 'display'. Default 'raw'.
  filter: "raw" | "edit" | "db" | "display" | "sample" = "raw";
  constructor(
    public meta: Meta,
    private logger: Logger,
    private queryUtil: QueryUtil,
    private postId: number,
    private _props: Props,
    private _terms: Map<string, types.WpTerms[]>,
    private _parents: types.Tables["posts"][] = [],
    private _children: types.Tables["posts"][] = []
  ) {
    this.meta.set("post", postId);
    this._terms = new Map();
  }

  get props() {
    return !this._props ? undefined : this._props;
  }

  withProps(props: Partial<Props>) {
    this._props = { ...this._props, ...props };
    return this;
  }

  async children() {
    if (!this._props?.ID || this._children.length > 0) {
      return this._children;
    }

    const postId = this.props?.ID as number;

    this._children =
      (await this.queryUtil.posts((query) => {
        query.withChildren(postId).builder.clear("select").select("*");
      }, z.array(val.database.wpPosts))) ?? [];

    //this._children = this._children.filter((post) => post.ID != this._props.ID);
    return this._children;
  }

  // get_post_ancestors
  async parents() {
    if (!this._props?.ID || this._parents.length > 0) {
      return this._parents;
    }

    const postId = this.props?.ID as number;

    this._parents =
      (await this.queryUtil.posts((query) => {
        query.withParents(postId).builder.clear("select").select("*");
      }, z.array(val.database.wpPosts))) ?? [];

    //this._parents = this._parents.filter((post) => post.ID != this.props?.ID);
    return this._parents;
  }

  async terms(taxonomy: types.TaxonomyName) {
    if (!this._props?.ID) return [];

    if (this._terms.get(taxonomy)) {
      return this._terms.get(taxonomy) ?? [];
    }

    try {
      const terms = await this.queryUtil.terms((query) => {
        const { column } = query.alias;
        query
          .withObjectIds([this._props.ID as number])
          .where("taxonomy", taxonomy)
          .builder.orderBy(column("terms", "term_id"), "asc");
      }, z.array(val.database.wpTerms));
      terms && this._terms.set(taxonomy, terms);
      return terms;
    } catch (e) {
      this.logger.info(`Terms not found: ${taxonomy}`);
      return [];
    }
  }

  async author() {
    return await this.queryUtil.users((query) => {
      query.where("ID", this._props.post_author).builder.first();
    }, val.database.wpUsers);
  }

  @asyncInit
  private async init() {
    if (0 >= this.postId) {
      return;
    }

    this.meta.set("post", this.postId);

    const post = await this.queryUtil.posts((query) => {
      query.get(this.postId);
    }, val.database.wpPosts);

    if (!post) {
      this.logger.info(`Post not found: ${this.postId}`);
      return;
    }
    this._props = post;
  }
}
