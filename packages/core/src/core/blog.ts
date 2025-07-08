import { Scope } from "../constants";
import { asyncInit } from "../decorators/async-init";
import { component } from "../decorators/component";
import * as val from "../validators";
import { QueryUtil } from "./utils/query.util";

import type * as types from "../types";
import { Meta } from "./meta";
import { Components } from "./components";
import { Logger } from "./logger";

type Props = types.Tables["blogs"];

@component({ scope: Scope.Transient })
export class Blog {
  constructor(
    private components: Components,
    private logger: Logger,
    public meta: Meta,
    private blogRef: string | number,
    private _props: Props
  ) {}

  get props() {
    return !this._props || 0 >= this._props?.blog_id ? undefined : this._props;
  }

  async options<T = string>(
    name: string,
    defaultValue?: T | undefined
  ): Promise<T | undefined> {
    const queryUtil = this.components.get(QueryUtil);
    const props = this.props;

    if (!props) {
      return undefined;
    }

    let value;
    try {
      value = (
        await queryUtil.usingBlog(props.blog_id).options((query) => {
          query.get(name);
        })
      )?.option_value;
    } catch (e) {
      value = defaultValue;
    }

    value = value ?? defaultValue;
    queryUtil.resetBlog();

    return value as T | undefined;
  }

  async name() {
    return await this.options("blogname");
  }

  async siteurl() {
    return await this.options("siteurl");
  }

  @asyncInit
  private async init() {
    if (!this.blogRef) {
      return;
    }

    const queryUtil = this.components.get(QueryUtil);
    const blog = await queryUtil.blogs((query) => {
      query.get(this.blogRef);
    }, val.database.wpBlogs);

    if (!blog) {
      this.logger.info(`Blog not found: ${this.blogRef}`);
      return;
    }

    this.meta.set("blog", blog.blog_id);

    this._props = blog;
  }
}
