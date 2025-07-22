import { Command } from "commander";
import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import { Cli } from "./cli";

import * as vals from "@rnaga/wp-node/validators";

@command("role", { description: "Role commands", version: "1.0.0" })
export class RolesCli extends Cli {
  private async getRole() {
    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const blogId = context.current.blogId;

    const roles = (
      await context.utils.crud.roles.list({
        blog_ids: [blogId],
      })
    )?.data?.[0].roles;

    const role = this.command.getArg(0, vals.helpers.string);

    return Object.keys(roles).includes(role as keyof typeof roles)
      ? roles[role as keyof typeof roles]
      : undefined;
  }

  @subcommand("get", { description: "Get a role" })
  async get(program: Command) {
    program.argument("<role>", "The role name (e.g. administator)");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const role = await this.getRole();

    if (!role) {
      this.output("error", `Role not found - ${this.options.role}`);
      return;
    }

    this.output("info", {
      message: `Role found - ${this.options.role}`,
      data: role,
    });

    return role;
  }

  @subcommand("list", { description: "List all roles" })
  async list(program: Command) {
    program.option("-b --blogId <blogId>", "The blog id to get roles for");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    if (!context.config.isMultiSite() && this.options.blogId) {
      this.output("error", "Blog id is not available in single site mode");
      return;
    }

    const blogId = parseInt(this.options.blogId ?? context.current.blogId);

    const roles = await context.utils.crud.roles.list({
      blog_ids: [blogId],
    });

    this.output("info", {
      message: `Roles found - blogId: ${blogId}`,
      data: roles.data[0],
    });

    return roles;
  }

  @subcommand("create", { description: "Create a role" })
  async create(program: Command) {
    program
      .argument("<role>", "The role name (e.g. administator)")
      .option(
        "-n --roleName <roleName>",
        "The readable role name (e.g. Administator)"
      )
      .option("-C --clone <clone>", "The role to clone");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const blogId = context.current.blogId;

    const currentRoles = await context.utils.roles.get(blogId);
    const roleKey = this.command.getArg(0, vals.helpers.string);

    let capabilities: string[] = [];

    // Clone the capabilities from another role.
    if (this.options.clone) {
      if (!currentRoles[this.options.clone]) {
        this.output("error", `Role to clone not found - ${this.options.clone}`);
        return;
      }
      capabilities = currentRoles[this.options.clone].capabilities;
    }

    const result = await context.utils.crud.roles.create({
      role: roleKey!,
      name: this.options.roleName ?? roleKey,
      capabilities,
    });

    if (!result.data) {
      this.output("error", "Failed to create role");
      return;
    }

    this.output("info", {
      message: `Role created - ${roleKey}`,
    });

    return result;
  }

  @subcommand("update", { description: "Update a role" })
  async update(program: Command) {
    program
      .argument("<role>", "The role name to update (e.g. administator)")
      .option(
        "-n --roleName <roleName>",
        "The readable role name (e.g. Administator)"
      )
      .option("-A --addCap <addCap>", "Add capabilities (comma separated)")
      .option(
        "-R --removeCap <removeCap>",
        "Remove capabilities (comma separated)"
      );

    await this.settings({ program });
    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const role = await this.getRole();

    if (!role) {
      this.output("error", `Role not found - ${this.argv[0]}`);
      return;
    }

    const roleKey = this.command.getArg(0, vals.helpers.string);

    if (this.options.addCap) {
      role.capabilities.push(...this.options.addCap.split(","));
    }

    if (this.options.removeCap) {
      role.capabilities = role.capabilities.filter(
        (cap) => !this.options.removeCap.split(",").includes(cap)
      );
    }

    if (this.options.roleName) {
      role.name = this.options.roleName;
    }

    const result = await context.utils.crud.roles.update(roleKey!, {
      name: role.name,
      capabilities: role.capabilities,
    });

    if (!result.data) {
      this.output("error", "Failed to update role");
      return;
    }

    this.output("info", {
      message: `Role updated - ${role.name}`,
      data: role,
    });

    return role;
  }

  @subcommand("delete", { description: "Delete a role" })
  async delete(program: Command) {
    program.argument("<role>", "The role name to delete (e.g. administator)");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const role = await this.getRole();

    if (!role) {
      this.output("error", `Role not found - ${this.argv[0]}`);
      return;
    }

    const roleKey = this.command.getArg(0, vals.helpers.string);
    const result = await context.utils.crud.roles.delete(roleKey!);

    if (!result.data) {
      this.output("error", "Failed to delete role");
      return;
    }

    this.output("info", {
      message: `Role deleted - ${role.name}`,
    });

    return result;
  }
}
