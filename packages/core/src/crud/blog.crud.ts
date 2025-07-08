import { z } from "zod";

import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { User } from "../core/user";
import { BlogUtil } from "../core/utils/blog.util";
import { QueryUtil } from "../core/utils/query.util";
import { UserUtil } from "../core/utils/user.util";
import { component } from "../decorators/component";
import { BlogsQuery } from "../query-builder";
import { BlogTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

import type * as types from "../types";
import { SiteUtil } from "../core/utils/site.util";
import { SettingsCrud } from "./settings.crud";
import { SignupUtil } from "../core/utils/signup.util";

type BlogUpdate = z.infer<typeof val.crud.blogUpdate>;
type BlogInsert = z.infer<typeof val.crud.blogInsert>;
type DataType = BlogUpdate & {
  is_main_blog: boolean;
  blogname: string;
  url: string;
  settings: Awaited<
    ReturnType<InstanceType<typeof SettingsCrud>["get"]>
  >["data"];
};
type BlogSettings = z.infer<typeof val.crud.settings>;

@component()
export class BlogCrud extends Crud {
  constructor(
    components: Components,
    private config: Config,
    private blogUtil: BlogUtil,
    private siteUtil: SiteUtil
  ) {
    super(components);
  }

  private async checkPermission(args?: { user?: User; blogId?: number }) {
    const { user: currentUser } = await this.getUser();
    const current = this.components.get(Current);
    const { user = currentUser, blogId = current.blogId } = args ?? {};

    if (
      !this.config.isMultiSite() ||
      !(await user.can("manage_sites", [blogId])) ||
      !(await user.can("delete_sites", [blogId])) ||
      !(await user.can("create_sites", [blogId]))
    ) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }
  }

  async get(blogId: number) {
    await this.checkPermission({ blogId });

    const blog = await this.blogUtil.get(blogId);

    if (!blog.props) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Blog not found");
    }

    const isMainBlog =
      (await this.blogUtil.getMainBlogId()) == blog.props.blog_id;

    const settingsCrud = this.components.get(SettingsCrud);

    return this.returnValue({
      ...blog.props,
      is_main_blog: isMainBlog,
      blogname: await blog.name(),
      url: await blog.siteurl(),
      blog_meta: await blog.meta.props(),
      settings: (await settingsCrud.get({ blogId })).data,
    } as DataType);
  }

  // src/wp-admin/network/site-info.php
  async update(
    blogId: number,
    data: Partial<BlogUpdate>,
    options?: {
      settings: BlogSettings;
    }
  ) {
    const { settings } = options ?? {};
    await this.checkPermission({ blogId });

    const blogUtil = this.components.get(BlogUtil);
    const currentBlog = (await this.get(blogId)).data;

    const mainBlogId = await blogUtil.getMainBlogId();

    // On the network's main site, don't allow the domain or path to change.
    if (mainBlogId == blogId) {
      data.domain = currentBlog.domain;
      data.path = currentBlog.path;
    }

    data.blog_id = blogId;

    const blogTrx = this.components.get(BlogTrx);
    const result = await blogTrx.upsert(data);

    // Update wp_options
    let settingsResult = true;
    if (settings) {
      const settingsCrud = this.components.get(SettingsCrud);
      settingsResult = (
        await settingsCrud.update(settings, {
          blogId,
        })
      ).data;
    }

    return this.returnValue(!!result && settingsResult);
  }

  // src/wp-admin/network/site-new.php
  async create(input: BlogInsert) {
    await this.checkPermission();

    const data = val.crud.blogInsert.parse(input);
    const { user } = await this.getUser();

    if (data.user_id) {
      const userUtil = this.components.get(UserUtil);
      const user = await userUtil.get(data.user_id);
      await this.checkPermission({ user });
    } else {
      data.user_id = user.props?.ID;
    }

    if (!data.user_id) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "User not specified");
    }

    const signupUtil = this.components.get(SignupUtil);
    const [isTrue, validationError] = await signupUtil.validateBlog(
      data.domain,
      data.title,
      user
    );

    if (!isTrue) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        validationError ?? "Invalid input"
      );
    }

    const userId = data.user_id;

    // If not a subdomain installation, make sure the domain isn't a reserved word.
    const reservedNames = await this.siteUtil.getReservedNames();
    if (
      !this.config.isSubdomainInstall() &&
      reservedNames.includes(data.domain)
    ) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        `The following words are reserved for use by WordPress functions and cannot be used as site names: ${data.domain}`
      );
    }

    const current = this.components.get(Current);

    if (
      !current.site?.props.site.domain ||
      !current.site?.props.site.path ||
      !current.site?.props.site.id
    ) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid site");
    }

    const siteDomain = current.site?.props.site.domain;
    const sitePath = current.site?.props.site.path;
    const siteId = current.site.props.site.id;

    if (this.config.isSubdomainInstall()) {
      data.domain = `${data.domain}.${siteDomain.replace(/^www\./, "")}`;
      data.path = sitePath;
    } else {
      data.path = `${sitePath}${data.domain}/`;
      data.domain = siteDomain;
    }

    const blogTrx = this.components.get(BlogTrx);
    return this.returnValue(
      await blogTrx.upsert({
        ...data,
        site_id: siteId,
        user_id: userId,
      })
    );
  }

  async delete(blogId: number) {
    await this.checkPermission({ blogId });

    const { user } = await this.getUser();
    const blog = (await this.get(blogId)).data;

    if (!(await user.can("delete_site", blog.blog_id))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to delete the site"
      );
    }

    const blogUtil = this.components.get(BlogUtil);
    const mainBlogId = await blogUtil.getMainBlogId();

    if (mainBlogId == blogId) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Can't delete the main blog"
      );
    }

    const blogTrx = this.components.get(BlogTrx);
    const result = await blogTrx.remove(blogId);
    return this.returnValue(result.props);
  }

  async list(args?: Partial<z.infer<typeof val.crud.blogListParams>>) {
    if (args?.site || args?.site_id) {
      const siteIds = [
        ...(args.site ?? []),
        ...(args?.site_id ? [args?.site_id] : []),
      ];
      const { user: currentUser } = await this.getUser();
      if (!(await currentUser.can("manage_network", siteIds))) {
        throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
      }
    } else {
      await this.checkPermission();
    }

    const queryUtil = this.components.get(QueryUtil);
    const blogUtil = this.components.get(BlogUtil);
    const parsedArgs = val.crud.blogListParams.parse(args ?? {});

    const buildQuery = (query: BlogsQuery) => {
      const { column } = query.alias;
      const offset =
        parsedArgs.offset ?? (parsedArgs.page - 1) * parsedArgs.per_page;
      const limit = parsedArgs.per_page;

      query.builder
        .offset(offset)
        .limit(limit)
        .groupBy(column("blogs", "blog_id"));

      if (parsedArgs.orderby) {
        if (parsedArgs.orderby == "url") {
          query.builder.orderBy([
            { column: column("blogs", "domain") },
            { column: column("blogs", "path"), order: parsedArgs.order },
          ]);
        } else {
          query.builder.orderBy(
            column("blogs", parsedArgs.orderby),
            parsedArgs.order
          );
        }
      }

      if (Array.isArray(parsedArgs.include)) {
        query.whereIn("blog_id", parsedArgs.include);
      }

      if (Array.isArray(parsedArgs.exclude)) {
        query.andWhereNot((query) =>
          query.whereIn("blog_id", parsedArgs.exclude as number[])
        );
      }

      if (parsedArgs.search) {
        query.andWhere((query) => {
          const searchColumns = ["domain", "path"] as const;
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
          case "public":
          case "archived":
          case "mature":
          case "spam":
          case "deleted":
          case "lang_id":
            query.where(key, value);
            break;
          case "site_id":
            query.where("site_id", value);
            break;
          case "site":
            query.whereIn("site_id", value as number[]);
            break;

          case "site_exclude":
            query.andWhereNot((query) =>
              query.whereIn("site_id", value as number[])
            );
            break;
        }
      }
    };

    const blogs =
      (await queryUtil.blogs((query) => {
        buildQuery(query);
      })) ?? [];

    const counts = await queryUtil.blogs((query) => {
      buildQuery(query);
      query.count("blogs", "blog_id");
    }, val.query.resultCount);

    const data = [];

    for (const blog of blogUtil.toBlogs(blogs)) {
      const props = blog.props as types.WpBlogs;

      data.push({
        ...props,
        blog_meta: await blog.meta.props(),
        blogname: await blog.name(),
        url: await blog.siteurl(),
      } as DataType);
    }

    const pagination = this.pagination({
      page: parsedArgs.page,
      limit: parsedArgs.per_page,
      count: counts?.count ?? 0,
    });

    return this.returnValue(data, {
      pagination,
    });
  }
}
