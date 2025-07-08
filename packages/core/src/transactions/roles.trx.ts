import { z } from "zod";

import { phpSerialize } from "../common";
import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { RolesUtil } from "../core/utils/roles.util";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { OptionsTrx } from "./options.trx";
import { Trx } from "./trx";

import type * as types from "../types";

type DataUpsert = z.infer<typeof val.trx.rolesUpsert>;

@transactions()
export class RolesTrx extends Trx {
  private static prohibitedRoles = ["superadmin", "anonymous"];
  constructor(
    private database: Database,
    private components: Components,
    private config: Config
  ) {
    super(components);
  }

  private async sync(userRoles: Record<string, types.Role>) {
    const current = this.components.get(Current);
    const optionsKey = `${current.tables.prefix}user_roles`;
    const optionsTrx = this.components.get(OptionsTrx);

    // Reformat capabilities
    const rolesUtil = this.components.get(RolesUtil);
    const reformattedRoles = rolesUtil.reformatInDB(userRoles);

    const result = await optionsTrx.update(
      optionsKey,
      phpSerialize(reformattedRoles)
    );
    await current.setUserRoles();
    return result;
  }

  private async getUserRoles(): Promise<Record<string, types.Role>> {
    const rolesUtil = this.components.get(RolesUtil);
    const current = this.components.get(Current);
    const userRoles = await rolesUtil.get(current.blogId);

    // Remove prohibited roles
    return Object.entries(userRoles)
      .filter(([roleName]) => !RolesTrx.prohibitedRoles.includes(roleName))
      .reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {});
  }

  async upsert(input: DataUpsert) {
    const parsedInput = val.trx.rolesUpsert.parse(input);

    const userRoles = await this.getUserRoles();
    let newUserRole: Record<string, types.Role>;

    const roleName =
      parsedInput.name ?? userRoles[parsedInput.role]?.name ?? parsedInput.role;

    const capabilities =
      parsedInput.capabilities ??
      userRoles[parsedInput.role]?.capabilities ??
      [];

    // Change role (key)
    if (parsedInput.new_role) {
      if (!userRoles[parsedInput.role]) {
        throw new Error("Role not found");
      }

      if (userRoles[parsedInput.new_role]) {
        throw new Error("Role already exists");
      }

      const roleBefore: types.Role = {
        name: roleName,
        capabilities,
      };

      // Remove role
      newUserRole = Object.entries(userRoles)
        .filter(([v]) => parsedInput.role !== v)
        .reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {});

      // Add role with new roleName
      newUserRole[parsedInput.new_role] = roleBefore;
    } else {
      newUserRole = {
        ...userRoles,
        [parsedInput.role]: {
          name: roleName,
          capabilities,
        },
      };
    }

    return await this.sync(newUserRole);
  }

  async remove(roleName: string) {
    const userRoles = await this.getUserRoles();

    const newUserRole: Record<string, types.Role> = Object.entries(userRoles)
      .filter(([v]) => roleName !== v)
      .reduce((a, b) => ({ ...a, [b[0]]: b[1] }), {});

    return await this.sync(newUserRole);
  }
}
