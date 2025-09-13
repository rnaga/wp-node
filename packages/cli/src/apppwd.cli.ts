import { Command } from "commander";
import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import { Cli } from "./cli";

import * as vals from "@rnaga/wp-node/validators";
import * as types from "@rnaga/wp-node/types";

@command("apppwd", {
  description: "Application Password commands",
  version: "1.0.0",
})
export class AppPwdCli extends Cli {
  private async getAndAssumeUser(
    context: Awaited<ReturnType<typeof Application.getContext>>,
    userRef: string | number
  ) {
    const user = await context.utils.user.get(userRef!);

    if (!user.props) {
      return undefined;
    }

    const userId = user.props.ID;

    // Switch to the found user
    await context.current.assumeUser(userId);

    return user;
  }

  @subcommand("list", { description: "List application passwords by userId" })
  async list(program: Command) {
    program.argument("<userRef>", "The user id or user login");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const userRef = this.command.getArg(0, vals.helpers.userRef);
    const user = await this.getAndAssumeUser(context, userRef!);

    if (!user) {
      this.output("error", "User not found");
      return;
    }

    const result = await context.utils.crud.applicationPasswords.list();

    this.output("info", {
      message: `Application Passwords found - userId: ${user.props!.ID}`,
      data: result.data,
    });
    return result.data;
  }

  @subcommand("create", { description: "Create a new term" })
  async create(program: Command) {
    program
      .argument("<userRef>", "The user id or user login")
      .argument("<name>", "The name of the password")
      .option("-p --appId <appId>", "The application ID");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const userRef = this.command.getArg(0, vals.helpers.userRef);
    const user = await this.getAndAssumeUser(context, userRef!);

    if (!user) {
      this.output("error", "User not found");
      return;
    }

    const passwordName = this.command.getArg(1, vals.helpers.string);

    const result = await context.utils.crud.applicationPasswords.create({
      name: passwordName!,
      app_id: this.options.appId,
    });

    this.output("info", {
      message: `Application password created - userId: ${user.props!.ID}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("update", { description: "Update an application password name" })
  async update(program: Command) {
    program
      .argument("<userRef>", "The user id or user login")
      .argument("<uuid>", "The UUID of the application password")
      .argument("<name>", "The new name of the application password");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const userRef = this.command.getArg(0, vals.helpers.userRef);
    const user = await this.getAndAssumeUser(context, userRef!);

    if (!user) {
      this.output("error", "User not found");
      return;
    }

    const uuid = this.command.getArg(1, vals.helpers.string);
    const name = this.command.getArg(2, vals.helpers.string);

    const result = await context.utils.crud.applicationPasswords.update(uuid!, {
      name: name!,
    });

    this.output("info", {
      message: `Application password updated - userId: ${
        user.props!.ID
      }, uuid: ${uuid}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("delete", {
    description: "Delete an application password by userId and uuid",
  })
  async delete(program: Command) {
    program
      .argument("<userRef>", "The user id or user login")
      .argument("<uuid>", "The UUID of the application password");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const userRef = this.command.getArg(0, vals.helpers.userRef);
    const user = await this.getAndAssumeUser(context, userRef!);

    if (!user) {
      this.output("error", "User not found");
      return;
    }

    const uuid = this.command.getArg(1, vals.helpers.string);
    const result = await context.utils.crud.applicationPasswords.delete(uuid!);

    this.output("info", {
      message: `Application password deleted - userId: ${
        user.props!.ID
      }, uuid: ${uuid}`,
      data: result.data,
    });

    return result;
  }
}
