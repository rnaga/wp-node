import { component } from "../decorators/component";
import { RoleNames } from "../types";
import * as val from "../validators";
import { Vars } from "./vars";

import type * as types from "../types";
import { Logger } from "./logger";
@component()
export class Roles {
  constructor(private vars: Vars, private logger: Logger) {}

  set(roles: types.Roles) {
    try {
      this.vars.USER_ROLES = {
        ...this.vars.USER_ROLES,
        ...val.roles.roles.parse(roles),
      };
    } catch (error) {
      this.logger.warn(`Validation error: ${error}`, { error });
    }
  }

  get<T = "anonymous">(name: RoleNames | T): types.Role | undefined;
  get(name: string): types.Role | undefined {
    try {
      return this.vars.USER_ROLES[name as string] ?? undefined;
    } catch (e) {
      throw new Error(`Invalid role ${name}`);
    }
  }

  get all() {
    return this.vars.USER_ROLES;
  }
}
