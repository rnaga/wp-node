import { z } from "zod";

import { checkPassword, formatting, hashPassword } from "../../common";
import { Config } from "../../config";
import { component } from "../../decorators/component";
import { MetaTrx, UserTrx } from "../../transactions";
import * as types from "../../types";
import * as val from "../../validators";
import { Components } from "../components";
import { Current } from "../current";
import { Logger } from "../logger";
import { Options } from "../options";
import { User } from "../user";
import { Vars } from "../vars";
import { BlogUtil } from "./blog.util";
import { QueryUtil } from "./query.util";
import { RolesUtil } from "./roles.util";

type DataGetBlogs = {
  blog_id: number;
  domain: string;
  path: string;
  site_id: number;
  siteurl: string | undefined;
  archived: number;
  spam: number;
  deleted: number;
  rolenames: string[] | undefined;
  blog_roles: Record<string, types.Role>;
  blogname: string | undefined;
};

@component()
export class UserUtil {
  constructor(
    private config: Config,
    private logger: Logger,
    private components: Components,
    private vars: Vars
  ) {}

  async get(userRef: string | number) {
    return await this.components.asyncGet(User, [userRef]);
  }

  async toUsers(users: types.Tables["users"][]) {
    const arr = [];
    for (const user of users) {
      arr.push(await this.components.asyncGet(User, [user.ID, user]));
    }
    return arr;
  }

  // count_many_users_posts
  async countPosts(
    userIds: number[],
    postType: types.PostType = "post",
    options?: Partial<{
      publicOnly: boolean;
    }>
  ) {
    const { publicOnly = false } = options ?? {};

    const queryUtil = this.components.get(QueryUtil);
    const counts = await queryUtil.posts((query) => {
      query.where("post_type", postType).whereIn("post_author", userIds);
      if (publicOnly) {
        query.where("post_status", "publish");
      }
      query.countGroupby("posts", "post_author");
    }, val.query.resultCountGroupBy("post_author"));

    return counts as undefined | [{ post_author: number; count: number }];
  }

  // reset_password
  async resetPassword(user: User, newPassword: string) {
    if (!user.props) {
      return;
    }
    const userId = user.props.ID;

    const userTrx = this.components.get(UserTrx);
    await userTrx.upsert({
      ID: userId,
      user_pass: hashPassword(newPassword),
    });

    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.upsert("user", userId, "default_password_nag", false);
  }

  // wp_is_password_reset_allowed_for_user
  isPasswordResetAllowed(user: User) {
    if (!this.config.isMultiSite()) {
      return true;
    }

    // is_user_spammy
    return 1 === user.props?.spam ? false : true;
  }

  //  check_password_reset_key
  async checkPasswordResetKey(resetKey: string, userRef: string | number) {
    resetKey = resetKey.replace(/[^a-z0-9]/gi, "");

    if (0 >= resetKey.length) {
      this.logger.info(`Invalid resetKey: ${resetKey}`);
      return false;
    }

    const user = await this.get(userRef);

    if (
      !user.props ||
      !user.props.user_activation_key ||
      0 >= user.props.user_activation_key.length
    ) {
      this.logger.info(
        `Invalid user or activation key - ${user.props?.ID} ${user.props?.user_activation_key}`
      );
      return false;
    }

    // Revoke activation key
    const userTrx = this.components.get(UserTrx);
    await userTrx.revokeActivationKey(user);

    const activationKey = user.props.user_activation_key;
    const [passRequestTime, storedHash] = activationKey.split(":");

    if (!passRequestTime.match(/^[0-9]+$/) || 0 >= storedHash.length) {
      this.logger.info(
        `Invalid passRequestTime or storedHash - ${passRequestTime} ${storedHash}`
      );
      return false;
    }

    const expirationDuration = parseInt(passRequestTime) + 60 * 60; // 3600sec

    if (Math.floor(Date.now() / 1000) > expirationDuration) {
      this.logger.info(`Reset key expired: ${expirationDuration}`);
      return false;
    }

    if (!checkPassword(resetKey, storedHash)) {
      return false;
    }

    return user.props.ID;
  }

  // Handles sending a password retrieval email to a user.
  // retrieve_password
  async getPasswordResetKey(
    userLogin: string,
    options?: Partial<{
      registration: boolean;
    }>
  ) {
    const { registration = false } = options ?? {};
    userLogin = formatting.unslash(userLogin);
    const user = await this.get(userLogin);

    if (!user.props) {
      throw new Error(
        `There is no account with that username or email address.' - ${userLogin}`
      );
    }

    // Generate something random for a password reset key.
    const userTrx = this.components.get(UserTrx);
    const resetKey = await userTrx.resetActivationKey(user);

    let siteName: string = "";

    if (this.config.isMultiSite()) {
      const current = this.components.get(Current);
      if (current.site?.props.blog.domain) {
        siteName = current.site?.props.blog.domain;
      }
    } else {
      const options = this.components.get(Options);
      const blogName = await options.get("blogname");
      if (blogName) {
        siteName = formatting.specialcharsDecode(blogName);
      }
    }

    // invoke action hook
    const context = this.vars.CONTEXT;
    context.hooks.action.do(
      "core_reset_password",
      resetKey,
      user,
      siteName,
      registration,
      context
    );

    return resetKey;
  }

  private roleNamesToCapabilities(
    roleNames: string[] | undefined,
    roles: Record<string, types.Role>
  ) {
    return (
      roleNames?.map((roleName) => roles[roleName].capabilities).flat() ?? []
    );
  }

  // Retrieves sites and blogs associated with a user.
  async getSites(userRef: string | number) {
    if (this.config.isMultiSite()) {
      return await this.getMultiSites(userRef);
    }
    return await this.getSingleSite(userRef);
  }

  async getSingleSite(userRef: string | number) {
    const rolesUtil = this.components.get(RolesUtil);
    const user = await this.get(userRef);

    if (!user.props?.user_login) {
      throw new Error("Invalid user");
    }

    const primaryBlog = (await this.getBlogs(userRef))[0];

    const roles = await rolesUtil.get();
    const capabilities = this.roleNamesToCapabilities(
      primaryBlog.rolenames,
      roles
    );

    return {
      user: user.props,
      primary_blog: {
        ...primaryBlog,
        capabilities,
      },
      is_multisite: false,
      sites: undefined,
    };
  }

  async getMultiSites(userRef: string | number) {
    const options = this.components.get(Options);

    const user = await this.get(userRef);

    if (!user.props?.user_login) {
      throw new Error("Invalid user");
    }

    const userLogin = user.props.user_login;

    type Blog = Awaited<
      ReturnType<InstanceType<typeof UserUtil>["getBlogs"]>
    >[number] & {
      capabilities: string[];
      blog_roles: Record<string, types.Role>;
      blogname: string | undefined;
    };

    // Blogs belonged to a user
    const blogsOfUser = await this.getBlogs(userRef);

    const siteIds = new Set<number>(blogsOfUser.map((blog) => blog.site_id));

    // User's primary blog
    const primaryBlogId = await this.getPrimaryBlogId(userRef);
    let primaryBlog: Blog | undefined;
    let primarySite: { sitename: string; siteurl: string } | undefined;

    const result = [];

    for (const siteId of Array.from(siteIds)) {
      const blogs: Blog[] = [];

      for (const blogOfUser of blogsOfUser.filter(
        (blog) => blog.site_id == siteId
      )) {
        blogs.push({
          ...blogOfUser,
          capabilities: this.roleNamesToCapabilities(
            blogOfUser.rolenames,
            blogOfUser.blog_roles
          ),
        });
      }

      primaryBlog = blogs.filter((blogs) => blogs.blog_id == primaryBlogId)[0];
      const optionValues = await options.get(["site_name", "siteurl"], {
        siteId,
      });

      const sitename = (optionValues.get("site_name") ?? "") as string;
      const siteurl = (optionValues.get("siteurl") ?? "") as string;

      if (primaryBlog) {
        primarySite = {
          sitename,
          siteurl,
        };
      }

      const rolesUtil = this.components.get(RolesUtil);
      const superAdmins = await rolesUtil.getSuperAdmins({ siteId });

      result.push({
        site_id: siteId,
        sitename,
        siteurl,
        is_superadmin: superAdmins.includes(userLogin),
        blogs,
      });
    }

    if (!primaryBlog && result.length > 0) {
      primaryBlog = result[0].blogs[0];
    }

    if (!primarySite) {
      primarySite = result[0];
    }

    return {
      user: user.props,
      primary_blog: !primaryBlog
        ? undefined
        : {
            ...primarySite,
            blog_id: primaryBlog.blog_id,
            site_id: primaryBlog.site_id,
            blog_roles: primaryBlog.blog_roles,
            blogname: primaryBlog.blogname ?? "",
            rolenames: primaryBlog.rolenames ?? [],
            capabilities: primaryBlog.capabilities,
          },
      is_multisite: true,
      sites: result,
    };
  }

  async getPrimaryBlogId(userRef: string | number) {
    const user = await this.get(userRef);

    if (!user.props?.user_login) {
      throw new Error("Invalid user");
    }

    if (!this.config.isMultiSite()) {
      return 1;
    }

    return await user.meta.get("primary_blog");
  }

  // get role names of user (across all blogs)
  async getRoleNames(userRefOrUser: string | number | User) {
    const user =
      typeof userRefOrUser == "string" || typeof userRefOrUser == "number"
        ? await this.get(userRefOrUser)
        : userRefOrUser;

    if (!user.props?.user_login) {
      throw new Error("Invalid user");
    }

    const userLogin = user.props.user_login;
    const metas = (await user.meta.props()) ?? {};

    const rolesMap = new Map<number, string[]>();

    for (const [key, value] of Object.entries<Record<string, boolean>>(metas)) {
      if (
        !key.startsWith(this.config.config.tablePrefix) ||
        !key.endsWith("_capabilities")
      ) {
        continue;
      }

      let blogId;
      const roleNames = Object.entries(value)
        .filter(([, value]) => value)
        .map(([roleName]) => roleName)
        .flat();

      if (key === `${this.config.config.tablePrefix}capabilities`) {
        blogId = 1;
      } else {
        const blogIdString = key.replace(
          new RegExp(`^${this.config.config.tablePrefix}|_capabilities$`, "g"),
          ""
        );

        if (!blogIdString.match(/^[0-9]+$/)) {
          continue;
        }

        blogId = parseInt(blogIdString);
      }

      rolesMap.set(blogId, roleNames);
    }

    // Super Admins
    if (this.config.isMultiSite()) {
      const queryUtil = this.components.get(QueryUtil);
      const siteIds = (
        (await queryUtil.meta("site", (query) => {
          query.whereLike("site_admins", `:"${userLogin}";`);
        })) ?? []
      ).map((site) => site.site_id);

      if (siteIds.length > 0) {
        const blogIds =
          (
            (await queryUtil.blogs((query) => {
              query.whereIn("site_id", siteIds);
            })) ?? []
          ).map((blog) => blog.blog_id) ?? [];

        for (const blogId of blogIds) {
          rolesMap.set(blogId, [...(rolesMap.get(blogId) ?? []), "superadmin"]);
        }
      }
    }

    return rolesMap;
  }

  // get site ids of user
  async getSiteIds(userRef: string | number) {
    const blogIds = await this.getBlogIds(userRef);
    const queryUtil = this.components.get(QueryUtil);

    const blogs =
      (await queryUtil.blogs(
        (query) => {
          const { column } = query.alias;
          query
            .whereIn("blog_id", blogIds)
            .select(["site_id"])
            .builder.groupBy(column("blogs", "site_id"));
        },
        z.array(
          z.object({
            site_id: z.number(),
          })
        )
      )) ?? [];

    return blogs.map((blog) => blog.site_id);
  }

  // get blog ids of user
  async getBlogIds(userRef: string | number) {
    if (!this.config.isMultiSite()) {
      return [1];
    }

    const user = await this.get(userRef);

    if (!user.props || !user.props.user_login) {
      throw new Error("Invalid user");
    }

    const userId = user.props.ID;

    const rolesMap = await this.getRoleNames(userId);

    const blogIds = [...rolesMap.keys()];
    return blogIds;
  }

  // get_blogs_of_user
  async getBlogs(
    userRef: string | number,
    options?: Partial<{
      siteId: number;
      blogId: number;
    }>
  ): Promise<DataGetBlogs[]> {
    const { siteId, blogId: targetBlogId } = options ?? {};
    const user = await this.get(userRef);

    if (!user.props) {
      throw new Error("Invalid user");
    }

    const userId = user.props.ID;
    const rolesUtil = this.components.get(RolesUtil);

    const rolesMap = await this.getRoleNames(userId);

    if (!this.config.isMultiSite()) {
      const options = this.components.get(Options);
      const vars = this.components.get(Vars);
      return [
        {
          blog_id: 1,
          domain: "",
          path: "",
          site_id: 0,
          siteurl: await options.get("siteurl"),
          archived: 0,
          spam: 0,
          deleted: 0,
          rolenames: rolesMap.get(1) ?? [],
          blog_roles: vars.USER_ROLES,
          blogname: await options.get("blogname"),
        },
      ];
    }

    let blogIds = [...rolesMap.keys()];
    // Filter if blogId is specified
    if (targetBlogId) {
      blogIds = blogIds.filter((blogId) => blogId === targetBlogId);
    }

    if (0 >= blogIds.length) {
      return [];
    }

    const queryUtil = this.components.get(QueryUtil);
    const blogs =
      (await queryUtil.blogs((query) => {
        query.whereIn("blog_id", blogIds);
        if (siteId) {
          query.where("site_id", siteId);
        }
      })) ?? [];

    const blogUtil = this.components.get(BlogUtil);

    const result = [];
    for (const blogItem of blogs) {
      if (0 >= blogItem.blog_id || 0 >= blogItem.site_id) {
        this.logger.warn(
          `Invalid blog - blog_id: ${blogItem.blog_id} domain: ${blogItem.domain} path: ${blogItem.path}`
        );
        continue;
      }
      const blog = blogUtil.toBlog(blogItem);
      result.push({
        ...blogItem,
        rolenames: rolesMap.get(blogItem.blog_id),
        blog_roles: await rolesUtil.get(blogItem.blog_id),
        siteurl: await blog.options("siteurl"),
        blogname: await blog.options("blogname"),
      });
    }

    return result;
  }

  async checkSuperAdminStatus(
    userRefOrUser: string | number | User,
    args?: {
      siteIds?: number[];
      blogIds?: number[];
    }
  ): Promise<[boolean, number[]]> {
    const user =
      typeof userRefOrUser === "string" || typeof userRefOrUser === "number"
        ? await this.get(userRefOrUser)
        : userRefOrUser;

    if (!user.props?.user_login) {
      throw new Error("Invalid user");
    }

    const userLogin = user.props.user_login;

    if (!this.config.isMultiSite()) {
      const role = await user.role();
      return [role.isAdmin(), [1]];
    }

    const { blogIds = [] } = args ?? {};
    let { siteIds = [] } = args ?? {};

    const queryUtil = this.components.get(QueryUtil);
    if (0 >= blogIds.length && 0 >= siteIds.length) {
      // Check superadmin across all sites
      siteIds = (
        (await queryUtil.sites((query) => {
          query;
        })) ?? []
      ).map((site) => siteIds.push(site.id));
    } else if (blogIds.length > 0) {
      siteIds = (
        (await queryUtil.blogs((query) => {
          query.whereIn("blog_id", blogIds);
        })) ?? []
      ).map((blog) => siteIds.push(blog.site_id));
    }

    if (0 >= siteIds.length) {
      return [false, []];
    }

    const rolesUtil = this.components.get(RolesUtil);
    for (const siteId of siteIds) {
      const superAdmins = await rolesUtil.getSuperAdmins({
        siteId,
      });

      if (!Array.isArray(superAdmins) || !superAdmins.includes(userLogin)) {
        return [false, []];
      }
    }

    return [true, siteIds];
  }

  async hasCapabilities(
    userRefOrUser: number | string | User,
    targetCapabilities: string[],
    options?: {
      blogIds?: number[];
    }
  ) {
    const user =
      typeof userRefOrUser == "string" || typeof userRefOrUser == "number"
        ? await this.get(userRefOrUser)
        : userRefOrUser;

    if (!user.props?.user_login || !user.props.ID) {
      throw new Error("Invalid user");
    }

    const { blogIds = [] } = options ?? {};
    if (0 >= blogIds.length) {
      const current = this.components.get(Current);
      blogIds.push(current.blogId);
    }

    const rolesUtil = this.components.get(RolesUtil);
    const roleNamesMap = await this.getRoleNames(user);

    for (const blogId of blogIds) {
      if (!roleNamesMap.get(blogId)) {
        return false;
      }

      const roleNames = roleNamesMap.get(blogId) as string[];
      const roles = await rolesUtil.get(blogId);

      let capabilities: string[] = [];
      for (const roleName of roleNames) {
        capabilities = [
          ...capabilities,
          ...(roles[roleName]?.capabilities ?? []),
        ];
      }

      if (
        targetCapabilities.filter((v) => capabilities.includes(v)).length !==
        targetCapabilities.length
      ) {
        return false;
      }
    }

    return true;
  }

  async getUniqueNicename(
    nicename: string,
    userLogin: string,
    maxSuffix: number = 10
  ) {
    const queryUtil = this.components.get(QueryUtil);

    nicename = formatting.slug(nicename);

    if (50 < nicename.length) {
      throw new Error(`user_nicename is too long - ${nicename}`);
    }

    for (let suffix = 0; suffix < maxSuffix; suffix++) {
      const newNicename = 0 >= suffix ? nicename : `${nicename}-${suffix + 1}`;
      const users = await queryUtil.users((query) => {
        query
          .where("user_nicename", newNicename)
          .builder.not.where("user_login", userLogin);
      });

      if (!users) {
        return newNicename;
      }
    }

    return `${nicename}-${Math.floor(
      Math.random() * (maxSuffix + 999990010 - maxSuffix + 1) + maxSuffix + 1
    )}`;
  }

  async getUniqueUserLogin(maxSuffix: number = 10) {
    const queryUtil = this.components.get(QueryUtil);
    const prefix = "user-";

    // Generate a random 6 character string
    const randomString = Math.random().toString(36).substring(2, 8);

    let userLogin = `${prefix}${randomString}`;

    const context = this.vars.CONTEXT;
    userLogin = await context.hooks.filter.asyncApply(
      "core_unigue_user_login",
      userLogin
    );

    for (let suffix = 0; suffix < maxSuffix; suffix++) {
      const users = await queryUtil.users((query) => {
        query.where("user_login", userLogin);
      });

      if (!users) {
        return userLogin;
      }

      userLogin = 0 >= suffix ? userLogin : `${userLogin}${suffix + 1}`;
    }

    return `${userLogin}-${Math.floor(
      Math.random() * (maxSuffix + 999990010 - maxSuffix + 1) + maxSuffix + 1
    )}`;
  }
}
