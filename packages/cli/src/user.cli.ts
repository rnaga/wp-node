import { Command } from "commander";
import { prompt } from "enquirer";

import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import * as vals from "@rnaga/wp-node/validators";
import { Cli } from "./cli";

@command("user", { description: "User commands", version: "1.0.0" })
export class UserCli extends Cli {
  @subcommand("get", { description: "Get a user by user id or user login" })
  async get(program: Command) {
    program
      .argument("<userRef>", "The user id or user login")
      .option("-M --more ", "Show more fields");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const userRef = this.command.getArg(0, vals.helpers.userRef);
    const user = await context.utils.user.get(userRef!);

    if (!user.props) {
      this.output("error", "User not found");
      return;
    }

    const userId = user.props.ID;
    const result = await context.utils.crud.user.get(userId, {
      context: this.options.more ? "edit" : "view",
    });

    this.output("info", {
      message: `User found - userId: ${user.props.ID}`,
      data: result.data,
    });
    return result.data;
  }

  @subcommand("addRole", { description: "Add a role to a user" })
  async addRole(program: Command) {
    program
      .argument("<userRef>", "The user id or user login")
      .argument("<role>", "The role to add");

    await this.settings({ program });

    const userRef = this.command.getArg(0, vals.helpers.userRef);
    const roleKey = this.command.getArg(1, vals.helpers.string);

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const user = await context.utils.user.get(userRef!);

    if (!user.props) {
      this.output("error", "User not found");
      return;
    }

    const userId = user.props.ID;

    const result = await context.utils.crud.user.updateRole(userId, [roleKey!]);

    if (!result.data) {
      this.output("error", "Failed to add role");
      return;
    }

    this.output("info", {
      message: `Role added to user - userId: ${userId} role: ${roleKey}`,
      data: { userId, role: roleKey },
    });

    return true;
  }

  @subcommand("removeRole", { description: "Remove a role from a user" })
  async removeRole(program: Command) {
    program
      .argument("<userRef>", "The user id or user login")
      .argument("<role>", "The role to remove");

    await this.settings({ program });

    const userRef = this.command.getArg(0, vals.helpers.userRef);
    const roleKey = this.command.getArg(1, vals.helpers.string);

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const user = await context.utils.user.get(userRef!);

    if (!user.props) {
      this.output("error", "User not found");
      return;
    }

    const userId = user.props.ID;
    const role = await user.roles();

    if (!role.includes(roleKey!)) {
      this.output("error", "User does not have the role");
      return;
    }

    const newRoles = role.filter((r) => r !== roleKey);

    const result = await context.utils.crud.user.updateRole(userId, newRoles);

    if (!result.data) {
      this.output("error", "Failed to remove role");
      return;
    }

    this.output("info", {
      message: `Role removed from user - userId: ${userId} role: ${roleKey}`,
      data: { userId, role: roleKey },
    });

    return true;
  }

  @subcommand("create", { description: "Create a new user" })
  async create(program: Command) {
    program
      .requiredOption("-l --userLogin <userLogin>", "The login of the user")
      .requiredOption("-e --email <email>", "The email of the user")
      .option("-p --password <password>", "Password of the user")
      .option("-d --displayName <displayName>", "Display name of the user")
      .option("-n --nickname <nickname>", "Nickname of the user")
      .option("-f --firstName <firstName>", "First name of the user")
      .option("-L --lastName <lastName>", "Last name of the user")
      .option("-r --role <role>", "Role of the user")
      .option("-D --description <description>", "Description of the user");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const user = await context.utils.crud.user.create({
      user_email: this.options.email,
      user_pass: this.options.password,
      user_login: this.options.userLogin,
      display_name: this.options.displayName,
      nickname: this.options.nickname,
      first_name: this.options.firstName,
      last_name: this.options.lastName,
      role: this.options.role,
      description: this.options.description,
    });

    if (!user.data) {
      this.output("error", "Failed to create user");
      return;
    }

    this.output("info", {
      message: `User created - userId: ${user.data.ID}`,
      data: user.data,
    });

    return user.data;
  }

  @subcommand("update", { description: "Update a user" })
  async update(program: Command) {
    program
      .argument("<user>", "The user id or user login")
      .option("-e --email <email>", "The email of the user")
      .option("-p --password <password>", "Password of the user")
      .option("-d --displayName <displayName>", "Display name of the user")
      .option("-n --nickname <nickname>", "Nickname of the user")
      .option("-f --firstName <firstName>", "First name of the user")
      .option("-L --lastName <lastName>", "Last name of the user")
      .option("-r --role <role>", "Role of the user")
      .option("-D --description <description>", "Description of the user");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const userRef = this.command.getArg(0, vals.helpers.userRef);

    const user = await context.utils.user.get(userRef!);

    if (!user.props) {
      this.output("error", "User not found");
      return;
    }

    const userId = user.props.ID;

    const result = await context.utils.crud.user.update(userId, {
      user_login: user.props.user_login,
      user_email: this.options.email ?? user.props.user_email,
      user_pass: this.options.password,
      display_name: this.options.displayName ?? user.props.display_name,
      nickname: this.options.nickname,
      first_name: this.options.firstName,
      last_name: this.options.lastName,
      role: this.options.role,
      description: this.options.description,
    });

    if (!result.data) {
      this.output("error", "Failed to update user");
      return;
    }

    this.output("info", {
      message: `User updated - userId: ${userId}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete a user" })
  async delete(program: Command) {
    program
      .argument("<user>", "The user id or user login")
      .option("-R --reassign <reassign>", "Reassign the posts to another user")
      .option("-n --network", "Delete the user from the network (multisite)")
      .option("-y --yes", "Skip the confirmation prompt");

    await this.settings({ program });

    const promptResponse = await prompt<{
      yes: boolean;
    }>([
      {
        type: "confirm",
        name: "yes",
        message: `Procceed? delete user: ${this.options.user}`,
        initial: this.options.yes ?? undefined,
        skip: this.options.yes !== undefined,
      },
    ]);

    if (!promptResponse.yes) {
      this.output("info", "Aborted");
      return false;
    }

    const userRef = this.command.getArg(0, vals.helpers.userRef);

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const user = await context.utils.user.get(userRef!);

    if (!user.props) {
      this.output("error", "User not found");
      return false;
    }

    const userId = user.props.ID;
    let result: boolean;

    if (this.options.network && context.config.isMultiSite()) {
      // Remove user from all blogs
      result = await context.utils.trx.user.removeFromAllBlogs(userId);
    } else {
      result = await context.utils.trx.user.remove(
        userId,
        this.options.reassign
      );
    }

    if (!result) {
      this.output("error", "Failed to delete user");
    }

    this.output("info", {
      message: this.options.network
        ? "User deleted from network"
        : "User deleted",
      data: user.props,
    });

    return result;
  }

  @subcommand("list", { description: "List users" })
  async list(program: Command) {
    program
      .option("-r --role <role>", "Filter by role")
      .option(
        "-o --orderby <orderby>",
        "Order by field (ID, user_login, user_url, user_email, user_registered, display_name)"
      )
      .option("-O --order <order>", "desc or asc", "asc")
      .option("-p --page <page>", "Page number")
      .option("-P --perpage <perpage>", "Users per page")
      .option("-S --search <search>", "Search for users")
      .option("-M --more", "Show more fields");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.user.list(
      {
        roles: this.options.role ? [this.options.role] : undefined,
        orderby: this.options.orderby,
        order: this.options.order,
        page: this.options.page,
        per_page: this.options.perpage,
        search: this.options.search,
      },
      {
        context: this.options.more ? "edit" : "view",
      }
    );

    if (!result.data.length) {
      this.output("error", "Users not found");
      return;
    }

    this.output("info", {
      message: `Users found - count: ${result.info.pagination.count}`,
      data: result.data,
    });

    return result;
  }
}
