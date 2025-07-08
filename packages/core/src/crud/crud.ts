import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { User } from "../core/user";
import { BlogUtil } from "../core/utils/blog.util";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { RolesUtil } from "../core/utils/roles.util";
import * as types from "../types";
import * as val from "../validators";
import { CrudError, StatusMessage } from "./error";

export abstract class Crud {
  constructor(protected components: Components) {}

  protected async getUser() {
    const current = this.components.get(Current);

    const user = current.user;
    const role = await user?.role();

    if (!user || (!user?.props?.ID && !role?.is("anonymous"))) {
      throw new Error("User not found");
    }

    return { user, userId: user.props?.ID, userProps: user.props };
  }

  private async checkPostsPermission(
    action: "edit_posts" | "delete_posts" | "read_private_posts",
    postType: string,
    defaultUser?: User
  ) {
    const postUtil = this.components.get(PostUtil);
    const postTypeObject = postUtil.getTypeObject(postType);
    const { user: currentUser } = await this.getUser();

    const user = defaultUser ?? currentUser;

    return postTypeObject?.capabilities &&
      postTypeObject.capabilities[action] &&
      (await user.can(postTypeObject.capabilities[action]))
      ? true
      : false;
  }

  private originalBlogId = 0;
  private originalSiteId = 0;

  protected async switchBlog(args: { siteId?: number; blogId?: number }) {
    const config = this.components.get(Config);
    if (!config.isMultiSite()) {
      return;
    }

    let { siteId = undefined } = args;
    const { blogId = undefined } = args;

    if (!siteId && !blogId) {
      return;
    }

    const current = this.components.get(Current);
    const { user: currentUser } = await this.getUser();

    if (blogId) {
      const blogUtil = this.components.get(BlogUtil);
      const blog = await blogUtil.get(blogId);

      if (!blog?.props || (siteId && siteId !== blog?.props.site_id)) {
        throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid Blog");
      }

      if (!siteId) {
        siteId = blog.props.site_id;
      }
    } else if (siteId) {
      if (!currentUser.props?.user_login) {
        throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
      }
      const userLogin = currentUser.props?.user_login;

      const rolesUtil = this.components.get(RolesUtil);
      const superAdmins = await rolesUtil.getSuperAdmins({ siteId });

      if (!superAdmins.includes(userLogin)) {
        // Only superadmin has access to all users in site (network)
        throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
      }
    }

    if (!siteId) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid site");
    }

    this.originalBlogId = current.blogId;
    this.originalSiteId = current.siteId;

    await current.switchSite(siteId, blogId);
    await current.assumeUser(currentUser.props?.ID);
  }

  protected async restoreBlog() {
    const config = this.components.get(Config);
    if (
      0 >= this.originalSiteId ||
      0 >= this.originalBlogId ||
      !config.isMultiSite()
    ) {
      return;
    }

    const { user: currentUser } = await this.getUser();
    const current = this.components.get(Current);

    await current.switchSite(this.originalSiteId, this.originalBlogId);
    await current.assumeUser(currentUser.props?.ID);
  }

  protected async getAvailableBlogs(args: {
    blogIds?: number[];
    siteIds?: number[];
    canArgs: Parameters<InstanceType<typeof User>["can"]>[];
  }): Promise<[{ blog_id: number; site_id: number }[], CrudError[]]> {
    const { siteIds, canArgs } = args;
    let { blogIds = [] } = args;

    const errors = [];

    const current = this.components.get(Current);
    const originalBlogId = current.blogId;
    const originalSiteId = current.siteId;
    const originalUserId = current.user?.props?.ID;

    try {
      const { user: currentUser } = await this.getUser();

      if (!currentUser.props?.ID) {
        errors.push(new CrudError(StatusMessage.BAD_REQUEST, "User not found"));
        return [[], errors];
      }

      const config = this.components.get(Config);
      const queryUtil = this.components.get(QueryUtil);
      const userId = currentUser.props?.ID;

      if (!config.isMultiSite()) {
        blogIds = [1];
      } else if (siteIds) {
        const blogs =
          (await queryUtil.blogs((query) => {
            query.whereIn("site_id", siteIds);
          })) ?? [];

        blogs.map((blog) => blogIds.push(blog.blog_id));
      }

      const blogs = [];
      for (const blogId of blogIds) {
        let blog: { blog_id: number; site_id: number };

        if (!config.isMultiSite()) {
          blog = { blog_id: blogId, site_id: 0 };
        } else {
          const result = await queryUtil.blogs((query) => {
            query.where("blog_id", blogId).builder.first();
          }, val.database.wpBlogs);

          if (!result) {
            errors.push(
              new CrudError(StatusMessage.BAD_REQUEST, "Invalid input")
            );
            continue;
          }

          blog = {
            blog_id: result.blog_id,
            site_id: result.site_id,
          };
        }

        const siteId = blog.site_id;

        await current.switchSite(siteId, blogId);
        await current.assumeUser(userId);

        if (!current?.user) {
          errors.push(
            new CrudError(StatusMessage.UNAUTHORIZED, "User not found")
          );
          continue;
        }

        for (const canArg of canArgs) {
          if (!(await current.user.can(...canArg))) {
            errors.push(
              new CrudError(StatusMessage.UNAUTHORIZED, "User not found")
            );
            continue;
          }
        }

        blogs.push(blog);
      }

      return [blogs, errors];
    } finally {
      await current.switchSite(originalSiteId, originalBlogId);
      await current.assumeUser(originalUserId);
    }
  }

  protected async checkBlogsPermission(args: {
    blogIds?: number[];
    siteIds?: number[];
    canArgs: Parameters<InstanceType<typeof User>["can"]>[];
  }) {
    const result = await this.getAvailableBlogs(args);
    if (result[1].length > 0) {
      throw result[1][0];
    }
  }

  protected async canEditPosts(
    postType: string,
    defaultUser?: User
  ): Promise<boolean> {
    return await this.checkPostsPermission("edit_posts", postType, defaultUser);
  }

  protected async canDeletePosts(
    postType: string,
    defaultUser?: User
  ): Promise<boolean> {
    return await this.checkPostsPermission(
      "delete_posts",
      postType,
      defaultUser
    );
  }

  protected async canReadPrivatePosts(
    postType: string,
    defaultUser?: User
  ): Promise<boolean> {
    return await this.checkPostsPermission(
      "read_private_posts",
      postType,
      defaultUser
    );
  }

  // check_read_permission
  protected async canReadPost(post: types.WpPosts): Promise<boolean> {
    const postUtil = this.components.get(PostUtil);
    const postTypeObject = postUtil.getTypeObject(post.post_type);

    if (!postTypeObject) {
      return false;
    }

    const { user: currentUser } = await this.getUser();

    if (
      "publish" == post.post_status ||
      (await currentUser.can("read_post", post.ID))
    ) {
      return true;
    }

    const postStatusObject = postUtil.getStatusObject(post.post_status);
    if (postStatusObject && postStatusObject.public) {
      return true;
    }

    // Can we read the parent if we're inheriting?
    if ("inherit" === post.post_status && post.post_parent > 0) {
      const parentPost = await postUtil.get(post.post_parent);
      if (parentPost.props) {
        return await this.canReadPost(parentPost.props);
      }
    }

    /*
     * If there isn't a parent, but the status is set to inherit, assume
     * it's published (as per get_post_status()).
     */
    if ("inherit" === post.post_status) {
      return true;
    }

    return false;
  }

  protected checkPasswordProtectedPost(post: types.WpPosts, password: string) {
    return post.post_password == "" || post.post_password == password;
  }

  protected pagination(params: { page: number; limit: number; count: number }) {
    return {
      page: params.page,
      limit: params.limit,
      totalPage: Math.ceil(params.count / params.limit),
      count: params.count,
    };
  }

  protected returnValue<T>(
    data: T,
    info?: undefined
  ): { data: T; info: undefined };
  protected returnValue<T, I>(data: T, info: I): { data: T; info: I };
  protected returnValue<T = any, I = any>(
    data: T,
    info: I | undefined = undefined
  ) {
    return {
      data,
      info,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(...arg2: any): Promise<ReturnType<Crud["returnValue"]>> {
    throw new Error("Get method not defined");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(...arg2: any): Promise<ReturnType<Crud["returnValue"]>> {
    throw new Error("Create method not defined");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async update(...arg2: any): Promise<ReturnType<Crud["returnValue"]>> {
    throw new Error("Update method not defined");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(...arg2: any): Promise<ReturnType<Crud["returnValue"]>> {
    throw new Error("Delete method not defined");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async list(...arg2: any): Promise<ReturnType<Crud["returnValue"]>> {
    throw new Error("List method not defined");
  }
}
