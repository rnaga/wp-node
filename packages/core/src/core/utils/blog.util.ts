import { Config } from "../../config";
import { component } from "../../decorators/component";
import * as val from "../../validators";
import { Blog } from "../blog";
import { Components } from "../components";
import { Current } from "../current";
import { QueryUtil } from "./query.util";

import type * as types from "../../types";

@component()
export class BlogUtil {
  constructor(private components: Components, private config: Config) {}

  async get(blogRef: string | number) {
    return await this.components.asyncGet(Blog, [blogRef]);
  }

  toBlog(blog: types.Tables["blogs"]) {
    return this.components.get(Blog, [blog.blog_id, blog]);
  }

  toBlogs(blogs: types.Tables["blogs"][]) {
    return blogs.map((blog) => {
      const toBlog = this.toBlog(blog);
      toBlog.meta.set("blog", blog.blog_id);
      return toBlog;
    });
  }

  async getMainBlogId() {
    const current = this.components.get(Current);

    if (!this.config.isMultiSite()) {
      return 1;
    }

    const siteId = current.site?.props.site.id;

    if (!siteId) {
      return 1;
    }

    const queryUtil = this.components.get(QueryUtil);
    const siteMeta = await queryUtil.sites((query) => {
      query
        .withMeta()
        .where("site_id", siteId)
        .where("meta_key", "main_site")
        .builder.first();
    }, val.database.wpSiteMeta);

    return parseInt(siteMeta?.meta_value ?? "1");
  }
}
