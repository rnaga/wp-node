import { DO_NOT_ALLOW } from "../../../constants";
import { filter, hook } from "../../../decorators/hooks";
import * as types from "../../../types";
import { z } from "zod";

@hook("core_filter_capabilities")
export class Capabilities {
  // delete_user
  @filter("core_map_meta_cap_delete_user")
  async canDeleteUser(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap_delete_user">
  ) {
    const [capabilities, context, user, targetUserId] = args;

    capabilities.delete("delete_user");

    if (!context.config.isMultiSite()) {
      return capabilities.add("delete_users");
    }

    const userLogin = user?.props?.user_login as string;

    if (typeof targetUserId !== "number" || !userLogin) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    const targetSiteIds = await context.utils.user.getSiteIds(targetUserId);
    if (targetSiteIds.length > 0) {
      const [isTrue] = await context.utils.user.checkSuperAdminStatus(user, {
        siteIds: targetSiteIds,
      });

      if (!isTrue) {
        return capabilities.add(DO_NOT_ALLOW);
      }
    }
    return capabilities;
  }

  // manage_network_user
  @filter("core_map_meta_cap")
  async canManageNetworkUser(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, targetUserId] = args;

    if (action !== "manage_network_user") {
      return capabilities;
    }

    capabilities.delete("manage_network_user");

    if (!context.config.isMultiSite()) {
      return capabilities.add("edit_users");
    }

    const userLogin = user?.props?.user_login as string;

    if (typeof targetUserId !== "number" || !userLogin) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    const targetSiteIds = await context.utils.user.getSiteIds(targetUserId);

    if (targetSiteIds.length > 0) {
      const [isTrue] = await context.utils.user.checkSuperAdminStatus(user, {
        siteIds: targetSiteIds,
      });

      if (!isTrue) {
        return capabilities.add(DO_NOT_ALLOW);
      }
    }

    return capabilities;
  }

  // manage_network_users
  @filter("core_map_meta_cap_manage_network_users")
  async canManageNetworkUsers(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap_manage_network_users">
  ) {
    const [capabilities, context, user, filterArgs] = args;

    if (!context.config.isMultiSite()) {
      capabilities.delete("manage_network_users");
      return capabilities.add("edit_users");
    }

    const parsed = z.array(z.number()).safeParse(filterArgs);

    if (!parsed.success) {
      return capabilities;
    }

    const blogIds = parsed.data;
    const siteIds = (
      (await context.utils.query.blogs((query) => {
        query.whereIn("blog_id", blogIds);
      })) ?? []
    ).map((blog) => blog.site_id);

    if (0 >= siteIds.length) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    return await this.canManageSiteUsers(
      capabilities,
      context,
      "manage_site_users" as types.RoleCapabilityActions,
      user,
      siteIds
    );
  }

  // list_blog_users
  @filter("core_map_meta_cap")
  async canListBlogUsers(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, filterArgs] = args;

    if (action !== "list_blog_users") {
      return capabilities;
    }

    capabilities.delete("list_blog_users");

    if (!context.config.isMultiSite()) {
      return capabilities.add("list_users");
    }

    let blogIds: number[] = [];
    if (
      !filterArgs ||
      !Array.isArray(filterArgs) ||
      filterArgs.length !==
        filterArgs.filter((v) => typeof v == "number").length
    ) {
      if (!context.current.blogId) {
        return capabilities.add(DO_NOT_ALLOW);
      }

      blogIds.push(context.current.blogId);
    } else {
      blogIds = filterArgs;
    }

    if (
      !(await user.hasCapabilities(["list_users"], {
        blogIds,
      }))
    ) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    return capabilities;
  }

  // manage_blog_users
  @filter("core_map_meta_cap")
  async canManageBlogUsers(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, ...filterArgs] = args;

    if (action !== "manage_blog_users") {
      return capabilities;
    }

    capabilities.delete("manage_blog_users");

    const result = await this.canManageNetworkUsers(
      capabilities,
      context,
      user,
      ...filterArgs
    );

    return result;
  }

  // manage_site_users
  @filter("core_map_meta_cap")
  async canManageSiteUsers(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, filterArgs] = args;

    if (action !== "manage_site_users") {
      return capabilities;
    }

    capabilities.delete("manage_site_users");

    if (!context.config.isMultiSite()) {
      return capabilities.add("edit_users");
    }

    if (
      !filterArgs ||
      !Array.isArray(filterArgs) ||
      filterArgs.length !==
        filterArgs.filter((v) => typeof v == "number").length
    ) {
      return capabilities;
    }

    const siteIds = filterArgs as number[];

    const userLogin = user?.props?.user_login as string;

    if (!userLogin) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    const [isTrue] = await context.utils.user.checkSuperAdminStatus(user, {
      siteIds,
    });

    if (!isTrue) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    return capabilities;
  }

  // edit_admin_roles
  // manage_roles
  @filter("core_map_meta_cap")
  async canEditAdminRole(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, filterArgs] = args;

    if (action !== "edit_admin_roles" && action !== "manage_roles") {
      return capabilities;
    }

    capabilities.delete("edit_admin_roles");
    capabilities.delete("manage_roles");

    if (!user.props?.user_login) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    if (!context.config.isMultiSite()) {
      capabilities.add("edit_users");
      return capabilities;
    }

    // Check for superadmin in multisite
    const blogId = filterArgs ?? context.current.blogId;

    if (!blogId) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    const [isTrue] = await context.utils.user.checkSuperAdminStatus(user, {
      blogIds: [blogId],
    });

    if (!isTrue) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    return capabilities;
  }

  // manage_network
  // manage_network_options
  @filter("core_map_meta_cap")
  async canManageNetwork(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, filterArgs] = args;

    if (action !== "manage_network" && action !== "manage_network_options") {
      return capabilities;
    }

    capabilities.delete("manage_network");
    capabilities.delete("manage_network_options");

    if (!context.config.isMultiSite()) {
      const role = await user.role();
      if (!role.isAdmin()) {
        return capabilities.add(DO_NOT_ALLOW);
      }
      return capabilities;
    }

    const parsed = z.array(z.number()).safeParse(filterArgs);

    if (!parsed.success) {
      return capabilities;
    }

    const siteIds = parsed.data;

    const [isTrue] = await context.utils.user.checkSuperAdminStatus(user, {
      siteIds,
    });

    if (!isTrue) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    return capabilities;
  }

  // edit_user_roles
  @filter("core_map_meta_cap")
  async canEditUserRole(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, filterArgs] = args;

    if (action !== "edit_user_roles") {
      return capabilities;
    }

    capabilities.delete("edit_user_roles");

    if (!user?.props?.user_login) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    if (!context.config.isMultiSite()) {
      capabilities.add("promote_users");
      capabilities.add("remove_users");
      return capabilities;
    }

    const parsed = z.array(z.number()).safeParse(filterArgs);

    if (!parsed.success) {
      capabilities.add("promote_users");
      capabilities.add("remove_users");
      return capabilities;
    }

    const blogIds = parsed.data;
    if (
      !(await user.hasCapabilities(["promote_users", "remove_users"], {
        blogIds,
      }))
    ) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    return capabilities;
  }

  // manage_sites
  // delete_sites
  // create_sites
  // manage_options
  @filter("core_map_meta_cap")
  async canManageBlogs(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, filterArgs] = args;

    const actions = [
      "manage_sites",
      "delete_sites",
      "create_sites",
      "manage_options",
    ];

    if (!context.config.isMultiSite() || !actions.includes(action)) {
      return capabilities;
    }

    const parsed = z.array(z.number()).safeParse(filterArgs);

    if (!parsed.success) {
      return capabilities;
    }

    const blogIds = parsed.data;

    const [isTrue] = await context.utils.user.checkSuperAdminStatus(user, {
      blogIds,
    });

    if (!isTrue) {
      return capabilities.add(DO_NOT_ALLOW);
    }

    capabilities.add(action);
    return capabilities;
  }

  // manage_terms
  // edit_terms
  // delete_terms
  // assign_terms
  @filter("core_map_meta_cap")
  async canManageTerms(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [capabilities, context, action, user, filterArgs] = args;

    const actions = [
      "manage_terms",
      "edit_terms",
      "delete_terms",
      "assign_terms",
    ];

    if (!actions.includes(action)) {
      return capabilities;
    }

    capabilities.delete(action);
    capabilities.add("manage_categories");
    return capabilities;
  }

  // create_users
  @filter("core_map_meta_cap")
  async canCreateUsers(
    ...args: types.hooks.FilterParameters<"core_map_meta_cap">
  ) {
    const [capabilities, context, action, user, filterArgs] = args;

    if (!context.config.isMultiSite() || action !== "create_users") {
      return capabilities;
    }

    const parsed = z.array(z.number()).safeParse(filterArgs);

    if (!parsed.success) {
      return capabilities;
    }

    const siteIds = parsed.data;

    const [isSuperAdmin] = await context.utils.user.checkSuperAdminStatus(
      user,
      {
        siteIds,
      }
    );

    // Check if a site allows admin to add new users
    if (!isSuperAdmin) {
      for (const siteId of siteIds) {
        const canAddNewUser = await context.options.get<number>(
          "add_new_users",
          {
            siteId,
          }
        );

        if (1 !== canAddNewUser) {
          return capabilities.add(DO_NOT_ALLOW);
        }
      }
    }

    // core/capabilities.ts might've disallowed permission.
    capabilities.delete(DO_NOT_ALLOW);

    capabilities.add(action);
    return capabilities;
  }
}
