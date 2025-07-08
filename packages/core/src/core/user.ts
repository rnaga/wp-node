import { Config } from "../config";
import { Scope } from "../constants";
import { asyncInit } from "../decorators/async-init";
import { component } from "../decorators/component";
import * as val from "../validators";
import { Components } from "./components";
import { Current } from "./current";
import { Logger } from "./logger";
import { Meta } from "./meta";
import { Options } from "./options";
import { Role } from "./role";
import { Roles } from "./roles";
import { QueryUtil } from "./utils/query.util";
import { UserUtil } from "./utils/user.util";

import type * as types from "../types";
@component({ scope: Scope.Transient })
export class User {
  private _role: Role;
  constructor(
    public meta: Meta,
    private logger: Logger,
    private queryUtil: QueryUtil,
    private components: Components,
    private config: Config,
    private userRef: string | number,
    private _props: types.Tables["users"],
    private _roles: string[]
  ) {
    this._role = this.components.get(Role);
  }

  async hasCapabilities(
    capabilities: string[],
    options?: {
      blogIds: number[];
    }
  ) {
    const userUtil = this.components.get(UserUtil);
    return userUtil.hasCapabilities(this, capabilities, options);
  }

  async role() {
    await this.roles();
    return this._role;
  }

  async roles() {
    if (!this._roles) {
      this.setAnonymous();
    }

    const user = this._props;
    const current = this.components.get(Current);

    const roles = [];

    this.meta.set("user", this._props.ID);

    // Grab and set a role from database
    const rolesMeta =
      (await this.meta.get<Record<string, boolean>>(
        `${current.tables.prefix}capabilities`
      )) ?? {};

    for (const [key] of Object.entries(rolesMeta)) {
      roles.push(key);
    }

    // Get the first role in array
    let primaryRoleName = roles[0];

    // Check super admin
    // get_super_admins
    // get_site_option( 'site_admins', array( 'admin' ) )
    const options = this.components.get(Options);

    if (this.config.isMultiSite()) {
      const superAdmins = await options.get<string[]>("site_admins", {
        siteId: current.site?.props.site?.id,
        //serialized: true,
      });

      if (Array.isArray(superAdmins) && superAdmins.includes(user.user_login)) {
        roles.push("superadmin");
        primaryRoleName = "superadmin";
      }
    }

    const roleJson = this.components.get(Roles).get(primaryRoleName);
    const role = this.components.get(Role, [
      roleJson?.name,
      roleJson?.capabilities,
    ]);

    // If user has more than one role, add its names and capabilities to a role
    if (roles.length > 1) {
      role.addNames(roles);
      for (const roleName of roles.slice(1)) {
        const roleJson = this.components.get(Roles).get(roleName);
        Array.isArray(roleJson?.capabilities) &&
          role.add(roleJson.capabilities);
      }
    }

    this._roles = roles;
    this._role = role;

    return this._roles;
  }

  get props() {
    return !this._props || 0 >= this._props.ID ? undefined : this._props;
  }

  private setDefaultProps(id: number = -1) {
    this._props = {
      ...this._props,
      ID: id,
    };
    this._roles = [];
  }

  private setAnonymous() {
    this.setDefaultProps(-1);
  }

  async can<T extends types.RoleCapabilityActions>(
    action: T,
    ...args: types.TMapMetaCapArgs<T>
  ): Promise<boolean>;
  async can<T extends string>(
    action?: T,
    ...args: types.TMapMetaCapArgs<T>
  ): Promise<boolean>;
  async can(action: any, ...args: any) {
    const role = await this.role();
    return await role.can(action, this, ...args);
  }

  // async bulkCan<T extends types.RoleCapabilityActions>(
  //   actionOrArrArgs: [T, ...types.TMapMetaCapArgs<T>[]][],
  //   arrArgs?: never
  // ): Promise<[T, types.TMapMetaCapArgs<T>, boolean][]>;
  // async bulkCan<T extends types.RoleCapabilityActions>(
  //   actionOrArrArgs: T,
  //   arrArgs: types.TMapMetaCapArgs<T>[]
  // ): Promise<[T, types.TMapMetaCapArgs<T>, boolean][]>;
  // async bulkCan(actionOrArrArgs: any, arrArgs?: any[]) {
  //   let bulkArgs: any[] = [];
  //   if (Array.isArray(actionOrArrArgs)) {
  //     bulkArgs = actionOrArrArgs;
  //   } else {
  //     arrArgs?.map((args) => bulkArgs.push([actionOrArrArgs, ...args]));
  //   }

  //   const results = [];
  //   for (const [action, ...args] of bulkArgs) {
  //     const result = await this.can(action, ...(args as any));
  //     results.push([action, args, result]);
  //   }

  //   return results;
  // }

  async bulkCan<T extends types.RoleCapabilityActions>(
    actionOrArrArgs: T | [T, ...types.TMapMetaCapArgs<T>][],
    arrArgs?: types.TMapMetaCapArgs<T>[]
  ): Promise<[T, types.TMapMetaCapArgs<T>, boolean][]> {
    let bulkArgs: any[] = [];

    // Check if the first argument is an array and handle it accordingly
    if (Array.isArray(actionOrArrArgs)) {
      if (actionOrArrArgs.length > 0 && Array.isArray(actionOrArrArgs[0])) {
        // Handle the case when the first argument is an array of arrays
        bulkArgs = actionOrArrArgs as [T, ...types.TMapMetaCapArgs<T>][];
      } else {
        // Handle the case when the first argument is just an array (of arguments for a single action)
        bulkArgs.push(actionOrArrArgs);
      }
    } else {
      // Handle the case when the first argument is a single action and the second is an array of arguments
      arrArgs?.forEach((args) => bulkArgs.push([actionOrArrArgs, ...args]));
    }

    const results: [T, types.TMapMetaCapArgs<T>, boolean][] = [];
    for (const [action, ...args] of bulkArgs) {
      const result = await this.can(action, ...(args as any));
      results.push([action, args, result]);
    }

    return results;
  }

  // async bulkCan<T extends types.RoleCapabilityActions>(
  //   actionOrArrArgs: T | [T, ...types.TMapMetaCapArgs<T>[]][],
  //   arrArgs?: types.TMapMetaCapArgs<T>[]
  // ): Promise<[T, types.TMapMetaCapArgs<T>[], boolean][]> {
  //   let bulkArgs: [T, ...types.TMapMetaCapArgs<T>[]][] = [];

  //   if (
  //     Array.isArray(actionOrArrArgs) &&
  //     actionOrArrArgs.every((item: any) => Array.isArray(item))
  //   ) {
  //     // When actionOrArrArgs is an array of arrays, cast it directly.
  //     bulkArgs = actionOrArrArgs as [T, ...types.TMapMetaCapArgs<T>[]][];
  //   } else if (!Array.isArray(actionOrArrArgs) && arrArgs) {
  //     // When actionOrArrArgs is a single action and arrArgs are provided.
  //     bulkArgs = arrArgs.map((args: any) => [actionOrArrArgs, ...args]);
  //   }

  //   const results: [T, types.TMapMetaCapArgs<T>[], boolean][] = [];
  //   for (const [action, ...args] of bulkArgs) {
  //     const result = await this.can(
  //       action,
  //       ...(args as types.TMapMetaCapArgs<T>)
  //     );
  //     results.push([action, args, result]);
  //   }

  //   return results;
  // }

  @asyncInit
  private async init() {
    this.setDefaultProps(this._props?.ID);

    let user = this._props;

    if (typeof this._props?.ID === "undefined" || 0 >= this._props?.ID) {
      if (!this.userRef) return;

      const result = await this.queryUtil.users((query) => {
        query.get(this.userRef);
      }, val.database.wpUsers);

      if (!result) {
        this.logger.info(`User not found: ${this.userRef}`);
        return;
      }

      // Set props
      this._props = result;
      user = result;
    } else if (
      // Sync userRef
      (typeof this.userRef == "number" && user.ID !== this.userRef) ||
      (typeof this.userRef == "string" &&
        user.user_nicename !== this.userRef &&
        user.display_name !== this.userRef &&
        user.user_email !== this.userRef)
    ) {
      this.userRef = user.ID;
    }

    this.meta.set("user", this._props.ID);

    // Set props with valid role and roles
    this._props = {
      ...this._props,
      ...user,
    };

    return this;
  }
}
