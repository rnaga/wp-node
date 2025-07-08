import { z } from "zod";

import { hashPassword } from "../common";
import { diffObject, diffStringArray } from "../common/diff";
import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Roles } from "../core/roles";
import { User } from "../core/user";
import { QueryUtil } from "../core/utils/query.util";
import { RolesUtil } from "../core/utils/roles.util";
import { UserUtil } from "../core/utils/user.util";
import { component } from "../decorators/component";
import { UsersQuery } from "../query-builder";
import { BlogTrx, SignupTrx, UserTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

import type * as types from "../types";

type DataUpsert = Partial<Awaited<ReturnType<UserCrud["getAsUpsert"]>>["data"]>;
type UserUpsert = z.infer<typeof val.trx.userUpsert>;

type DataType<T extends "view" | "edit" | "embed"> = T extends "edit"
  ? Exclude<User["props"], "user_pass"> & {
      metas: Record<string, any>;
      roles: string[];
      capabilities: string[];
      posts: number;
    }
  : {
      ID: number;
      display_name: string;
      user_nicename: string;
      user_login: string;
      user_url: string;
    };

type ReturnTypeUserUtilGetSites = Awaited<
  ReturnType<InstanceType<typeof UserUtil>["getSites"]>
>;

type ReturnTypeUserUtilGetBlogs = Awaited<
  ReturnType<InstanceType<typeof UserUtil>["getBlogs"]>
>;

type Blog = Pick<
  NonNullable<ReturnTypeUserUtilGetSites["primary_blog"]> &
    ReturnTypeUserUtilGetBlogs[number],
  "site_id" | "blog_id" | "blogname" | "rolenames" | "capabilities"
> & {
  blog_roles: Record<string, types.Role> | undefined;
};

type DataTypeGetSites = {
  user: ReturnTypeUserUtilGetSites["user"];
  primary_blog: Blog;
  is_multisite: ReturnTypeUserUtilGetSites["is_multisite"];
  sites:
    | undefined
    | {
        site_id: number;
        sitename: string;
        siteurl: string;
        is_superadmin: boolean;
        blogs: Blog[] | undefined;
      }[];
};

@component()
export class UserCrud extends Crud {
  constructor(components: Components, private config: Config) {
    super(components);
  }

  async getAsUpsert(userId: number) {
    const user = await this.get(userId, { context: "edit" });
    const userUpsertMeta = val.trx.userUpsertMeta.parse(user.data.metas);
    const userUpsert = val.trx.userUpsert
      .merge(
        z.object({
          user_login: val.database.wpUsers.shape.user_login,
          user_pass: z.string().transform(() => ""),
        })
      )
      .parse({
        ...user.data,
        role: user.data.roles,
        meta_input: user.data.metas,
      });

    return this.returnValue({
      ...userUpsert,
      ...userUpsertMeta,
    } as z.infer<typeof val.trx.userUpsert>);
  }

  // check_role_update
  private async checkRoleUpdatePermission(userId: number, role: string[]) {
    const { user: currentUser } = await this.getUser();

    if (!currentUser.props?.ID) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Invalid User");
    }

    const currentUserId = currentUser.props.ID;
    const currentRole = await currentUser.role();

    // Changing role
    if (
      role.length > 0 &&
      diffStringArray(Array.from(currentRole.names), role).length > 0 &&
      !(await currentUser.can("promote_user", userId))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit roles of this user"
      );
    }

    // Removing role
    if (0 >= role.length && !(await currentUser.can("remove_users"))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit roles of this user"
      );
    }

    /*
     * Don't let anyone with 'edit_users' (admins) edit their own role to something without it.
     * Multisite super admins can freely edit their blog roles -- they possess all caps.
     */
    if (
      (!this.config.isMultiSite() ||
        !(await currentUser.can("manage_sites"))) &&
      currentUserId === userId &&
      !(await currentUser.can("edit_users"))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to give users that role"
      );
    }
  }

  async get<T extends "view" | "edit" | "embed">(
    userId: number = 0,
    options?: Partial<{
      context: T;
    }>
  ) {
    const userUtil = this.components.get(UserUtil);
    const { user: currentUser } = await this.getUser();

    let targetUser: User = currentUser;
    if (userId > 0 && currentUser.props?.ID !== userId) {
      if (!(await currentUser.can("list_users"))) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "Sorry, you are not allowed to list users"
        );
      }
      targetUser = await userUtil.get(userId);
    }

    if (!targetUser.props) {
      throw new CrudError(StatusMessage.NOT_FOUND, "User not found");
    }

    let data = {};
    const targetRole = await targetUser.role();
    if (
      options?.context == "edit" &&
      (currentUser.props?.ID === userId ||
        (await currentUser.can("edit_users")))
    ) {
      data = {
        ...targetUser.props,
        metas: await targetUser.meta.props(),
        role: Array.from(targetRole.names),
        capabilities: targetRole.capabilities,
      };
    } else {
      data = {
        ID: targetUser.props.ID,
        display_name: targetUser.props.display_name,
        user_nicename: targetUser.props.user_nicename,
        user_url: targetUser.props.user_url,
      };
    }

    return this.returnValue(data as DataType<T>);
  }

  async getBlogs(userId: number) {
    const { user: currentUser, userProps: currentUserProps } =
      await this.getUser();

    if (!currentUserProps || !(await currentUser.can("manage_network_users"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const userUtil = this.components.get(UserUtil);
    const blogs = await userUtil.getBlogs(userId);

    if (0 >= blogs.length) {
      return this.returnValue([]);
    }

    const blogIds = blogs.map((blog) => blog.blog_id);

    if (!(await currentUser.can("list_blog_users", blogIds))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    return this.returnValue(
      blogs.map((blog) => ({
        site_id: blog.site_id,
        blog_id: blog.blog_id,
        blogname: blog.blogname,
        rolenames: blog.rolenames,
      }))
    );
  }

  async getAvailableSites() {
    const { user: currentUser, userProps: currentUserProps } =
      await this.getUser();

    if (!currentUserProps) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const userUtil = this.components.get(UserUtil);
    const currentUserId = currentUserProps.ID;

    const currentSites = await userUtil.getSites(currentUserId);

    if (!currentSites.primary_blog) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Not permitted (no primary blog)"
      );
    }

    const getCapabilities = async (
      user: User,
      blogId: number,
      siteId: number,
      capabilities: string[]
    ) => {
      const set = new Set<string>(capabilities);
      if (await user.can("edit_user_roles", [blogId])) {
        set.add("edit_user_roles");
      }

      if (await user.can("manage_roles", blogId)) {
        set.add("manage_roles");
      }

      if (await user.can("list_blog_users", [blogId])) {
        set.add("list_blog_users");
      }

      if (!(await user.can("manage_blog_users", [blogId]))) {
        set.delete("edit_users");
      }

      (await user.can("create_users", [siteId]))
        ? set.add("create_users")
        : set.delete("create_users");

      return Array.from(set);
    };

    const getBlog = async (
      blog:
        | NonNullable<(typeof currentSites)["sites"]>[number]["blogs"][number]
        | NonNullable<(typeof currentSites)["primary_blog"]>
    ): Promise<Blog> => {
      const capabilities = await getCapabilities(
        currentUser,
        blog.blog_id,
        blog.site_id,
        blog.capabilities
      );

      const returnValue = {
        site_id: blog.site_id,
        blog_id: blog.blog_id,
        blogname: blog.blogname,
        rolenames: blog.rolenames,
        blog_roles: undefined,
        capabilities,
      };

      if (await currentUser.can("manage_blog_users", [blog.blog_id])) {
        return {
          ...returnValue,
          blog_roles: blog.blog_roles,
        };
      }

      return returnValue;
    };

    const sites = [];
    for (const site of currentSites.sites ?? []) {
      const blogs = [];

      for (const blog of site.blogs) {
        blogs.push(await getBlog(blog));
      }

      if (blogs.length > 0) {
        sites.push({
          site_id: site.site_id,
          sitename: site.sitename,
          siteurl: site.siteurl,
          is_superadmin: site.is_superadmin,
          blogs,
        });
      }
    }

    return this.returnValue({
      user: currentSites.user,
      primary_blog: await getBlog(currentSites.primary_blog),
      is_multisite: this.config.isMultiSite(),
      sites: 0 >= sites.length ? undefined : sites,
    } as DataTypeGetSites);
  }

  async create(input: Partial<UserUpsert>) {
    const { user: currentUser } = await this.getUser();

    if (!(await currentUser.can("create_users"))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to create new users"
      );
    }

    const data = val.trx.userUpsert.parse(input);

    // For not to attach default role (subscriber)
    data.role = !input.role ? undefined : data.role;

    if (data.role) {
      const roleNames = Array.isArray(data.role)
        ? data.role
            .map((roleName) => roleName.trim())
            .filter((roleName) => roleName.length > 0)
        : [data.role];

      if (0 >= roleNames.length) {
        data.role = undefined;
      } else {
        const roles = this.components.get(Roles);
        for (const roleName of roleNames) {
          if (!roles.get(roleName)) {
            throw new CrudError(
              StatusMessage.BAD_REQUEST,
              `The role does not exist. - ${data.role}`
            );
          }
        }
      }
    }

    data.ID = undefined;

    const userTrx = this.components.get(UserTrx);
    const newUserId = await userTrx.upsert(data, {
      attachRole: data.role ? true : false,
    });

    const userUtil = this.components.get(UserUtil);
    const newUser = await userUtil.get(newUserId);

    if (!newUser.props) {
      throw new CrudError(StatusMessage.NOT_FOUND, "User not found");
    }

    const newUserLogin = newUser.props.user_login;

    if (this.config.isMultiSite()) {
      const signupTrx = this.components.get(SignupTrx);
      await signupTrx.remove(newUserLogin);

      if (data.role) {
        const blogTrx = this.components.get(BlogTrx);
        const current = this.components.get(Current);
        await blogTrx.addUser(current.blogId, newUserId, data.role);
      }
    }

    return this.returnValue(newUser.props);
  }

  async updateSuperAdmin(
    userId: number,
    options?: Partial<{
      siteId: number;
      blogId: number;
      remove: boolean;
    }>
  ) {
    if (!this.config.isMultiSite()) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Not supported");
    }
    try {
      const { blogId, siteId, remove = false } = options ?? {};

      await this.switchBlog({
        siteId,
        blogId,
      });

      const userUtil = this.components.get(UserUtil);
      const user = await userUtil.get(userId);

      if (!user.props?.user_login) {
        throw new CrudError(StatusMessage.NOT_FOUND, "User not found");
      }

      const { user: currentUser } = await this.getUser();

      // Not allowing to remove own.
      if (
        (userId === currentUser.props?.ID && remove) ||
        !(await currentUser.can("manage_network_users"))
      ) {
        throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
      }

      const userTrx = this.components.get(UserTrx);
      await userTrx.syncSuperAdmin(userId, {
        siteId,
        blogId,
        remove,
      });

      return this.returnValue(true);
    } finally {
      await this.restoreBlog();
    }
  }

  async updateRole(
    userId: number,
    role: string[],
    options?: Partial<{
      siteId: number;
      blogId: number;
    }>
  ) {
    try {
      const { blogId, siteId } = options ?? {};

      await this.switchBlog({
        siteId,
        blogId,
      });

      const parsedRole = z.array(z.string()).parse(role);

      await this.checkRoleUpdatePermission(userId, parsedRole);

      const userUtil = this.components.get(UserUtil);
      const user = await userUtil.get(userId);

      if (!user.props?.user_login) {
        throw new CrudError(StatusMessage.NOT_FOUND, "User not found");
      }

      const userTrx = this.components.get(UserTrx);

      if (parsedRole.length > 0) {
        await userTrx.upsertRole(userId, parsedRole);
      } else {
        await userTrx.removeRole(userId, {
          removeSuperAdmin: false,
        });
      }

      return this.returnValue(true);
    } finally {
      await this.restoreBlog();
    }
  }

  async update(
    userId: number,
    data: Partial<UserUpsert>,
    options?: Partial<{
      siteId: number;
      blogId: number;
      attachRole: boolean;
      removeRole: boolean;
    }>
  ) {
    try {
      const {
        blogId,
        siteId,
        attachRole = false,
        removeRole = false,
      } = options ?? {};

      await this.switchBlog({
        siteId,
        blogId,
      });

      data.ID = userId;

      const { user: currentUser } = await this.getUser();
      const queryUtil = this.components.get(QueryUtil);

      const currentUserData = (await this.getAsUpsert(userId)).data;
      const diffData = diffObject(data, currentUserData) as Partial<DataUpsert>;

      if (!(await currentUser.can("edit_user", userId))) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "Sorry, you are not allowed to edit this user"
        );
      }

      if (
        diffData.user_login ||
        currentUserData.user_login !== data.user_login
      ) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "User Login is not editable"
        );
      }

      if (
        typeof data.user_nicename == "string" &&
        data.user_nicename.length > 0 &&
        data.user_nicename !== currentUserData.user_nicename &&
        (await queryUtil.users((query) => {
          query.where("user_nicename", data.user_nicename as string);
        }))
      ) {
        throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid slug");
      }

      const userTrx = this.components.get(UserTrx);

      if (data.role) {
        const roleNames = Array.isArray(data.role)
          ? data.role
              .map((roleName) => roleName.trim())
              .filter((roleName) => roleName.length > 0)
          : [data.role];

        await this.checkRoleUpdatePermission(userId, roleNames);

        if (0 >= roleNames.length) {
          data.role = undefined;
        } else {
          const roles = this.components.get(Roles);
          for (const roleName of roleNames) {
            if (!roles.get(roleName)) {
              throw new CrudError(
                StatusMessage.BAD_REQUEST,
                `The role does not exist - ${data.role}`
              );
            }
          }
        }
      }

      return this.returnValue(
        await userTrx.upsert(data, {
          attachRole,
          removeRole,
        })
      );
    } finally {
      await this.restoreBlog();
    }
  }

  async updatePassword(userId: number, newPassword: string) {
    const userUtil = this.components.get(UserUtil);

    const user = await userUtil.get(userId);

    if (!user.props || !user.props.user_login) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "User not found");
    }

    const userLogin = user.props.user_login;
    const hashedPassword = hashPassword(newPassword);
    return await this.update(userId, {
      user_login: userLogin,
      user_pass: hashedPassword,
    });
  }

  async delete(
    userId: number,
    options?: Partial<{
      reassign: number;
      reassignList: Record<number, number>;
    }>
  ) {
    const { reassignList = undefined } = options ?? {};
    let { reassign = undefined } = options ?? {};

    const { user: currentUser } = await this.getUser();

    const userTrx = this.components.get(UserTrx);

    if (!(await currentUser.can("delete_user", userId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to delete this user"
      );
    }

    if (!this.config.isMultiSite()) {
      if (reassignList) {
        reassign = Object.values(reassignList)[0];
      }
      return this.returnValue(await userTrx.remove(userId, reassign));
    }

    return this.returnValue(
      await userTrx.removeFromAllBlogs(userId, reassignList)
    );
  }

  async list<T extends "view" | "edit" | "embed">(
    args?: Partial<z.infer<typeof val.crud.userListParams>>,
    options?: { context?: T }
  ) {
    try {
      const { context = "view" } = options ?? {};

      const queryUtil = this.components.get(QueryUtil);
      const userUtil = this.components.get(UserUtil);
      const rolesUtil = this.components.get(RolesUtil);
      const parsedArgs = val.crud.userListParams.parse(args ?? {});

      await this.switchBlog({
        siteId: parsedArgs.site_id,
        blogId: parsedArgs.blog_id,
      });

      const { user: currentUser } = await this.getUser();
      const currentRole = await currentUser.role();

      if (
        (parsedArgs.roles ||
          parsedArgs.superadmins ||
          parsedArgs.include_unregistered_users ||
          context == "edit" ||
          parsedArgs.orderby == "user_email" ||
          parsedArgs.orderby == "user_registered") &&
        (!currentUser.props?.ID || !(await currentUser.can("list_users")))
      ) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "Sorry, you are not allowed to filter users by role"
        );
      }

      let blogIds: number[] = [];
      let superAdmins: string[] = [];

      if (this.config.isMultiSite()) {
        const current = this.components.get(Current);
        superAdmins =
          (await rolesUtil.getSuperAdmins({
            siteId: current.siteId,
          })) ?? [];

        if (parsedArgs.site_id) {
          const siteId = parsedArgs.site_id;
          const blogs =
            (await queryUtil.blogs((query) => {
              query.where("site_id", siteId);
            })) ?? [];

          // List all users in site
          blogs.map((blog) => blogIds?.push(blog.blog_id));
        } else {
          const current = this.components.get(Current);
          blogIds = [parsedArgs.blog_id ?? current.blogId];
        }
      }

      const includeAnonymous =
        Array.isArray(parsedArgs.roles) &&
        parsedArgs.roles.filter((role) => role === "anonymous").length > 0;

      const roleNames = !Array.isArray(parsedArgs.roles)
        ? []
        : parsedArgs.roles.filter((role) => role !== "anonymous");

      const buildSearchQuery = (query: UsersQuery) => {
        query.andWhere((query) => {
          const searchColumns = [
            "user_login",
            "user_nicename",
            "display_name",
            "user_email",
          ] as const;
          for (const searchColumn of searchColumns) {
            parsedArgs.search &&
              query.or.whereLike(searchColumn, parsedArgs.search);
          }
        });
      };

      const buildQuery = (query: UsersQuery) => {
        const { column } = query.alias;
        const offset =
          parsedArgs.offset ?? (parsedArgs.page - 1) * parsedArgs.per_page;
        const limit = parsedArgs.per_page;

        if (includeAnonymous && !parsedArgs.exclude_anonymous) {
          query.hasNoRole();
        } else if (blogIds.length > 0) {
          query.andWhere((query) => {
            query.withBlogIds(blogIds);
          });
        } else if (!this.config.isMultiSite()) {
          // For single site
          query.hasRole();
        }

        query.builder
          .offset(offset)
          .limit(limit)
          .groupBy(column("users", "ID"));

        if (parsedArgs.orderby) {
          query.builder.orderBy(
            column("users", parsedArgs.orderby),
            parsedArgs.order
          );
        }

        if (Array.isArray(parsedArgs.include)) {
          query.whereIn("ID", parsedArgs.include);
        }

        if (Array.isArray(parsedArgs.exclude)) {
          query.andWhereNot((query) =>
            query.whereIn("ID", parsedArgs.exclude as number[])
          );
        }

        if (parsedArgs.search) {
          buildSearchQuery(query);
        }

        if (Array.isArray(parsedArgs.slug) && parsedArgs.slug.length > 0) {
          query.where("user_nicename", parsedArgs.slug);
        }

        if (roleNames.length > 0) {
          query.withRoles(roleNames);
        }

        // SuperAdmins
        if (superAdmins.length > 0) {
          if (parsedArgs.site_id && currentRole.isSuperAdmin()) {
            query[parsedArgs.superadmins ? "andWhere" : "orWhere"]((query) => {
              query.whereIn("user_login", superAdmins);
            });
          }
        }

        // Include anonymous users if no role is specified
        if (
          !includeAnonymous &&
          !parsedArgs.exclude_anonymous &&
          0 >= roleNames.length &&
          !parsedArgs.superadmins
        ) {
          query.orWhere((query) => {
            query.hasNoRole();
            if (parsedArgs.search) {
              buildSearchQuery(query);
            }
          });
        }

        if (parsedArgs.has_published_posts) {
          query.withPublishedPosts();
        }
      };

      const users =
        (await queryUtil.users((query) => {
          buildQuery(query);
        })) ?? [];

      const counts = await queryUtil.users((query) => {
        buildQuery(query);
        query.count("users", "ID");
      }, val.query.resultCount);

      const countPosts =
        context !== "edit"
          ? []
          : await userUtil.countPosts(users.map((user) => user.ID));
      const data = [];

      for (const user of await userUtil.toUsers(users)) {
        if (!user.props) continue;

        // const props = Object.entries(user.props)
        //   .filter(([k]) => k !== "user_pass")
        //   .reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {}) as Exclude<
        //   types.WpUsers,
        //   "user_pass"
        // >;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user_pass, ...props } = user.props;
        const role = await user.role();

        const posts =
          countPosts?.filter((v) => v.post_author == props.ID)[0]?.count ?? 0;

        if (this.config.isMultiSite() && !currentRole.isSuperAdmin()) {
          role.names.delete("superadmin");
        }

        if (context === "edit") {
          data.push({
            ...props,
            metas: await user.meta.props(),
            roles: Array.from(role.names),
            capabilities: role.capabilities,
            posts,
          });
        } else {
          data.push({
            ID: props.ID,
            display_name: props.display_name,
            user_url: props.user_url,
            user_nicename: props.user_nicename,
            user_login: props.user_login,
            posts,
          });
        }
      }

      const pagination = this.pagination({
        page: parsedArgs.page,
        limit: parsedArgs.per_page,
        count: counts?.count ?? 0,
      });

      return this.returnValue(data as Array<DataType<T>>, {
        pagination,
        context,
      });
    } finally {
      await this.restoreBlog();
    }
  }
}
