import { z } from "zod";

import { formatting } from "../common";
import { Blog } from "../core/blog";
import { Components } from "../core/components";
import { Installer } from "../core/installer";
import { Logger } from "../core/logger";
import { BlogUtil } from "../core/utils/blog.util";
import { QueryUtil } from "../core/utils/query.util";
import { UserUtil } from "../core/utils/user.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { LinkTrx } from "./link.trx";
import { MetaTrx } from "./meta.trx";
import { PostTrx } from "./post.trx";
import { Trx } from "./trx";
import { UserTrx } from "./user.trx";

import type * as types from "../types";
type DataUpsert = z.infer<typeof val.trx.blogUpsert>;

@transactions()
export class BlogTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private blogUtil: BlogUtil,
    private validator: Validator
  ) {
    super(components);
  }

  // Change site id
  async changeSite(
    blogId: number,
    newSiteId: number,
    options?: {
      domain?: string;
      path?: string;
    }
  ) {
    const queryUtil = this.components.get(QueryUtil);

    const { domain, path } = options ?? {};

    const blog = await queryUtil.blogs((query) => {
      query.where("blog_id", blogId).builder.first();
    }, val.database.wpBlogs);

    if (!blog || newSiteId == blog.site_id) {
      // can't move to the same site
      return;
    }

    const newSite = await queryUtil.sites((query) => {
      query.where("id", newSiteId).builder.first();
    }, val.database.wpSite);

    if (!newSite) {
      throw new Error("Site not found");
    }

    return await this.upsert({
      blog_id: blogId,
      site_id: newSiteId,
      domain: domain ?? blog.domain,
      path: path ?? blog.path,
    });
  }

  // wp_insert_site
  // wp_update_site
  async upsert(
    input: Partial<DataUpsert>,
    options?: {
      dontInitialize?: boolean;
    }
  ) {
    const { dontInitialize = false } = options ?? {};

    let update = false;
    let blogBefore: Blog | undefined = undefined;
    let userId = 0;

    if (input.blog_id && 0 < input.blog_id) {
      update = true;

      blogBefore = await this.blogUtil.get(input.blog_id);

      if (!blogBefore) {
        throw new Error(`Blog not found - ${input.blog_id}`);
      }

      input = {
        ...blogBefore.props,
        blog_meta: await blogBefore.meta.props(),
        ...input,
      };
    } else if (input.user_id) {
      userId = input.user_id;
    }

    const parsedInput = val.trx.blogUpsert.parse(input);
    let dataUpsert: any = {};

    try {
      dataUpsert = this.validator.execAny(
        update ? val.trx.blogUpdate : val.trx.blogInsert,
        parsedInput
      );
    } catch (e) {
      this.logger.info(`parse error: ${e}`, { parsedInput });
      throw e;
    }

    let blogId = parsedInput.blog_id ?? 0;

    const trx = await this.database.transaction;
    try {
      if (update) {
        await trx
          .table(this.tables.get("blogs"))
          .where("blog_id", parsedInput.blog_id)
          .update(dataUpsert);
      } else {
        await trx
          .insert(dataUpsert)
          .into(this.tables.get("blogs"))
          .then((v) => {
            blogId = v[0];
          });
      }
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert blog - ${e}`);
    }
    await trx.commit();

    const blog = await this.blogUtil.get(blogId);

    if (!blog.props?.blog_id) {
      throw new Error(`Blog not found - ${blogId}`);
    }

    if (parsedInput.blog_meta) {
      const metaTrx = this.components.get(MetaTrx);
      for (const [key, value] of Object.entries(parsedInput.blog_meta)) {
        if (!value) {
          continue;
        }
        await metaTrx.upsert("blog", blogId, key, value, {
          serialize: typeof value == "object" || Array.isArray(value),
        });
      }
    }

    if (!update && !dontInitialize) {
      const installer = this.components.get(Installer);
      await installer.initializeBlog(blogId, {
        userId,
        title: input.title,
        options: input.options,
      });
    }

    return blogId;
  }

  // wp_delete_site
  async remove(blogId: number) {
    const blog = await this.blogUtil.get(blogId);

    if (!blog.props?.blog_id) {
      throw new Error(`Blog does not exist - ${blogId}`);
    }

    const installer = this.components.get(Installer);
    await installer.uninitializeBlog(blogId);

    const trx = await this.database.transaction;

    try {
      await trx
        .table(this.tables.get("blogmeta"))
        .where("blog_id", blogId)
        .del();

      await trx.table(this.tables.get("blogs")).where("blog_id", blogId).del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to delete blog - ${e}`);
    }
    await trx.commit();

    return blog;
  }

  // add_user_to_blog
  async addUser(
    blogId: number,
    userId: number,
    roleName?: types.UpsertRoleName,
    options?: Partial<{
      superAdmin: boolean;
    }>
  ): Promise<boolean>;
  async addUser(
    blogId: number,
    userId: number,
    roleName?: Parameters<UserTrx["upsertRole"]>[1],
    options?: Partial<{
      superAdmin: boolean;
    }>
  ): Promise<boolean>;
  async addUser(
    blogId: number,
    userId: number,
    roleName?: any,
    options?: Partial<{
      superAdmin: boolean;
    }>
  ): Promise<boolean> {
    const queryUtil = this.components.get(QueryUtil);
    const metaTrx = this.components.get(MetaTrx);
    const userTrx = this.components.get(UserTrx);

    const { superAdmin = false } = options ?? {};

    userTrx.usingBlog(blogId);
    metaTrx.usingBlog(blogId);
    queryUtil.usingBlog(blogId);

    const user = queryUtil.users((query) => {
      query.where("ID", userId).builder.first();
    }, val.database.wpUsers);

    if (!user) {
      throw new Error(
        `user_does_not_exist - userId: ${userId} blogId: ${blogId}`
      );
    }

    const blog = await queryUtil.blogs((query) => {
      query.where("blog_id", blogId).builder.first();
    }, val.database.wpBlogs);

    if (!blog) {
      throw new Error(`Blog not found - ${blogId}`);
    }

    const primaryBlog = await queryUtil.meta(
      "user",
      (query) => {
        query.withIds([userId]).withKeys(["primary_blog"]).builder.first();
      },
      val.database.wpUserMeta
    );

    if (!primaryBlog) {
      await metaTrx.upsert("user", userId, "primary_blog", blogId);
      await metaTrx.upsert("user", userId, "source_domain", blog.domain);
    }

    await userTrx.upsertRole(userId, roleName);

    if (superAdmin) {
      await userTrx.syncSuperAdmin(userId, {
        blogId,
      });
    }

    return true;
  }

  // remove_user_from_blog
  async removeUser(
    blogId: number,
    userId: number,
    userIdToReassign: number = 0
  ) {
    const userUtil = this.components.get(UserUtil);
    const metaTrx = this.components.get(MetaTrx);
    const userTrx = this.components.get(UserTrx);
    const linkTrx = this.components.get(LinkTrx);
    const postTrx = this.components.get(PostTrx);
    const queryUtil = this.components.get(QueryUtil);

    linkTrx.usingBlog(blogId);
    userTrx.usingBlog(blogId);
    postTrx.usingBlog(blogId);
    queryUtil.usingBlog(blogId);

    const primaryBlog = await queryUtil.meta(
      "user",
      (query) => {
        query.withIds([userId]).withKeys(["primary_blog"]).builder.first();
      },
      val.database.wpUserMeta
    );

    if (formatting.primitive(primaryBlog?.meta_value) == blogId) {
      let newBlogId = 0;
      let newDomain = "";
      const blogs = await userUtil.getBlogs(userId);

      for (const blog of blogs) {
        if (blog.blog_id === blogId) {
          continue;
        }
        newBlogId = blog.blog_id;
        newDomain = blog.domain;
        break;
      }

      if (newBlogId > 0) {
        await metaTrx.upsert("user", userId, "primary_blog", newBlogId);
        await metaTrx.upsert("user", userId, "source_domain", newDomain);
      }
    }

    await userTrx.removeRole(userId, { removeSuperAdmin: false });

    const blogs = await userUtil.getBlogs(userId);

    if (!blogs || 0 >= blogs.length) {
      await metaTrx.remove("user", { objectId: userId, key: "primary_blog" });
      await metaTrx.remove("user", {
        objectId: userId,
        key: "source_domain",
      });
    }

    if (0 < userIdToReassign) {
      await postTrx.changeAuthor(userId, userIdToReassign);
      await linkTrx.changeUser(userId, userIdToReassign);
    }

    return true;
  }
}
