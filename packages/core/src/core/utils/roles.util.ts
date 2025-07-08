import { Config } from "../../config";
import { Scope } from "../../constants";
import { component } from "../../decorators/component";
import * as defaults from "../../defaults";
import * as val from "../../validators";
import { Components } from "../components";
import { Logger } from "../logger";
import { Options } from "../options";
import { Tables } from "../tables";
import { MetaUtil } from "./meta.util";
import { QueryUtil } from "./query.util";

import type * as types from "../../types";
@component({ scope: Scope.Transient })
export class RolesUtil {
  constructor(
    private config: Config,
    private logger: Logger,
    private components: Components
  ) {}

  /**
   * Reformat user roles to be stored in DB
   *
   * @param userRoles - User roles
   * @returns
   */
  public reformatInDB(userRoles: Record<string, types.Role>): Record<
    string,
    {
      name: string;
      capabilities: Record<string, 1>;
    }
  > {
    return Object.entries(userRoles).reduce(
      (a, b) => ({
        ...a,
        [b[0]]: {
          name: b[1].name,
          capabilities: b[1].capabilities.reduce(
            (a, b) => ({ ...a, [b]: 1 }),
            {}
          ),
        },
      }),
      {}
    );
  }

  // Get roles of blog
  async get(blogId: number = 1): Promise<Record<string, types.Role>> {
    const tables = this.components.get(Tables);
    tables.index = blogId;

    const optionsKey = `${tables.prefix}user_roles`;
    const options = this.components.get(Options);

    const roleRecord: types.RoleRecord | types.Role =
      (await options
        .usingBlog(blogId)
        .get<types.RoleRecord | types.Role>(optionsKey)) ?? {};

    const roles = Object.entries(roleRecord)
      .map(([roleName, role]) => ({
        [roleName]: {
          name: role.name,
          // 1. The format of capabilities is either Record<string, true> or string[]
          // 2. Reformat it to string[]
          capabilities: Array.isArray(role.capabilities)
            ? role.capabilities
            : Object.entries(role.capabilities).map(([c]) => c),
        },
      }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    if (!roles) {
      this.logger.warn("User roles are not defined in DB. Use default roles");
      return defaults.roles;
    }

    if (this.config.isMultiSite()) {
      const mergeCapabilities = (roles: Array<types.Role | undefined>) => {
        const capabilities = new Set<string>();
        for (const role of roles) {
          if (!role || !Array.isArray(role["capabilities"])) {
            continue;
          }

          role["capabilities"].map((capability) =>
            capabilities.add(capability)
          );
        }

        return Array.from(capabilities);
      };

      roles["superadmin"] = {
        ...this.config.config.roles["superadmin"],
        capabilities: mergeCapabilities([
          this.config.config.roles["superadmin"],
          roles["administrator"],
        ]),
      };
    }

    // Set anonymous
    roles["anonymous"] = this.config.config.roles["anonymous"];

    return roles;
  }

  // Return number of roles
  async count(blogId: number = 1) {
    const roles = await this.get(blogId);
    const roleNames = Object.keys(roles).filter(
      (roleName) => !["superadmin", "anonymous"].includes(roleName)
    );

    const queryUtil = this.components.get(QueryUtil);
    const superAdmins = await this.getSuperAdmins({ blogId });

    const counts: Record<string, number> = {};
    for (const roleName of roleNames) {
      const count = await queryUtil.usingBlog(blogId).users((query) => {
        query.withRoles([roleName]).select(["ID"]);
        query.count("users", "ID");
      }, val.query.resultCount);

      counts[roleName] = count?.count ?? 0;
    }

    // Anonymous users
    const countAnonymous = await queryUtil.usingBlog(blogId).users((query) => {
      query
        .select(["ID"])
        .hasNoRole()
        .andWhereNot((query) => {
          query.whereIn("user_login", superAdmins);
        });
      query.count("users", "ID");
    }, val.query.resultCount);

    counts["anonymous"] = countAnonymous?.count ?? 0;

    return counts as Record<string, number | undefined>;
  }

  async getSuperAdmins(
    args:
      | { blogId: number; siteId?: never }
      | { blogId?: never; siteId: number }
  ) {
    if (!this.config.isMultiSite()) {
      return [];
    }

    const queryUtil = this.components.get(QueryUtil);
    const metaUtil = this.components.get(MetaUtil);

    let siteId: number;
    if (args.siteId) {
      siteId = args.siteId;
    } else if (args.blogId) {
      const blogId = args.blogId;
      const blogs = await queryUtil.blogs((query) => {
        query.where("blog_id", blogId);
      });

      if (!blogs) {
        return [];
      }

      siteId = blogs[0].site_id;
    } else {
      return [];
    }

    const superAdmins = await metaUtil.getValue<string[]>(
      "site",
      siteId,
      "site_admins"
    );

    return superAdmins ?? [];
  }
}
