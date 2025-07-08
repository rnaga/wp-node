import { Scope } from "../constants";
import { asyncInit } from "../decorators/async-init";
import { component } from "../decorators/component";
import * as val from "../validators";
import { Meta } from "./meta";
import { QueryUtil } from "./utils/query.util";

import type * as types from "../types";

/**
 * https://github.com/WordPress/WordPress/blob/master/wp-includes/class-wp-site.php
 */
@component({ scope: Scope.Transient })
export class Site {
  constructor(
    public meta: Meta,
    private queryUtil: QueryUtil,
    private siteRef: number | string,
    private blogRef: number | string = 1,
    private _props: {
      site: Partial<types.Tables["site"]>;
      blog: Partial<types.Tables["blogs"]> & {
        blog_id: number;
      };
    }
  ) {
    //Set default if _props is not passed
    if (!this._props) {
      this._props = { site: { id: 1 }, blog: { blog_id: 1 } };
    }
  }

  get props() {
    return this._props;
  }

  async setBlog(b: number | string) {
    const blog =
      (await this.queryUtil.blogs((query) => {
        query.get(b);
      }, val.database.wpBlogs)) ?? this._props.blog;

    if (this._props.site.id !== blog.site_id) {
      throw new Error(
        `Site Id doesn't match ${this._props.site.id} - ${blog.site_id}`
      );
    }

    this._props.blog = blog;
    this.blogRef = b;
  }

  @asyncInit
  private async init() {
    this._props.site =
      (await this.queryUtil.sites((query) => {
        query.get(this.siteRef);
      }, val.database.wpSite)) ?? this._props.site;

    await this.setBlog(this.blogRef);

    this._props.site.id && this.meta.set("site", this._props.site.id);
  }
}
