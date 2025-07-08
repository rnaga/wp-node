import { z } from "zod";

import { Config } from "../config";
import { Components } from "../core/components";
import { RolesUtil } from "../core/utils/roles.util";
import { Vars } from "../core/vars";
import { component } from "../decorators/component";
import * as defaults from "../defaults";
import { RolesTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

type RoleUpsert = z.infer<typeof val.trx.rolesUpsert>;

@component()
export class RolesCrud extends Crud {
  constructor(components: Components, private config: Config) {
    super(components);
  }

  private async checkPermission(roleNames: string[]) {
    const defaultRoles = defaults.roles;
    const { user: currentUser } = await this.getUser();

    if (!(await currentUser.can("manage_roles"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    for (const roleName of roleNames) {
      // Default roles are not allowed to edit
      if (Object.keys(defaultRoles).includes(roleName)) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "Not permitted to edit default roles"
        );
      }
    }
  }

  async create(
    data: RoleUpsert,
    options?: Partial<{
      siteId: number;
      blogId: number;
      remove: boolean;
    }>
  ) {
    try {
      const { blogId, siteId } = options ?? {};

      await this.switchBlog({
        siteId,
        blogId,
      });

      await this.checkPermission([data.role]);

      const vars = this.components.get(Vars);
      const currentUserRoles = vars.USER_ROLES;

      if (currentUserRoles[data.role]) {
        throw new CrudError(StatusMessage.BAD_REQUEST, "Role already exists");
      }

      data.new_role = undefined;

      const roleTrx = this.components.get(RolesTrx);
      const result = await roleTrx.upsert(data);
      return this.returnValue(result);
    } finally {
      await this.restoreBlog();
    }
  }

  async delete(
    roleName: string,
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

      await this.checkPermission([roleName]);

      const roleTrx = this.components.get(RolesTrx);
      const result = await roleTrx.remove(roleName);
      return this.returnValue(result);
    } finally {
      await this.restoreBlog();
    }
  }

  async update(
    roleName: string,
    data: Omit<RoleUpsert, "role">,
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

      const updateData = {
        ...data,
        role: roleName,
      };

      const roleNames = data.new_role ? [roleName, data.new_role] : [roleName];
      await this.checkPermission(roleNames);
      data.new_role = undefined;

      const roleTrx = this.components.get(RolesTrx);
      const result = await roleTrx.upsert(updateData);
      return this.returnValue(result);
    } finally {
      await this.restoreBlog();
    }
  }

  async list(args: z.infer<typeof val.crud.rolesListParams>) {
    let blogIds: number[] | undefined;

    if (!this.config.isMultiSite()) {
      blogIds = [1];
    } else {
      const parsedArgs = val.crud.rolesListParams.parse(args);
      blogIds = parsedArgs.blog_ids;
    }

    const [blogs, errors] = await this.getAvailableBlogs({
      blogIds,
      canArgs: [["list_users"]],
    });

    if (errors.length > 0) {
      throw errors[0];
    }

    const roles: {
      blog: (typeof blogs)[number];
      roles: Awaited<ReturnType<InstanceType<typeof RolesUtil>["get"]>>;
    }[] = [];

    const roleUtil = this.components.get(RolesUtil);
    for (const blog of blogs) {
      const blogId = blog.blog_id;
      roles.push({
        blog,
        roles: await roleUtil.get(blogId),
      });
    }

    return this.returnValue(roles);
  }

  async count(args: z.infer<typeof val.crud.rolesCountListParams>) {
    let siteId: number | undefined;
    let blogId: number | undefined;

    if (!this.config.isMultiSite()) {
      blogId = 1;
      siteId = undefined;
    } else {
      const parsedArgs = val.crud.rolesCountListParams.parse(args);
      blogId = parsedArgs.blog_id;
      siteId = parsedArgs.site_id;
    }

    if (!blogId && !siteId) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Missing parameter");
    }

    await this.checkBlogsPermission({
      blogIds: blogId ? [blogId] : undefined,
      siteIds: siteId ? [siteId] : undefined,
      canArgs: [["list_users"]],
    });

    const rolesUtil = this.components.get(RolesUtil);
    let counts: Record<string, number | undefined> = {};

    if (siteId) {
      const superAdmins = await rolesUtil.getSuperAdmins({ siteId });
      counts = { superadmins: superAdmins.length };
    } else if (blogId) {
      counts = await rolesUtil.count(blogId);
    }

    return this.returnValue(counts);
  }
}
