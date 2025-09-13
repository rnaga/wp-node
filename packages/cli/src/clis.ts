import { Command } from "commander";

import { CONFIG_DIR } from "./constants";
import { REFLECT_METADATA_KEY_SUBCOMMAND } from "./constants";
import { Constructor } from "@rnaga/wp-node/types";
import { BlogCli } from "./blog.cli";
import { CommentCli } from "./comment.cli";
import { ConfigsCli } from "./configs.cli";
import { InitCli } from "./init.cli";
import { InstallCli } from "./install.cli";
import { MetaCli } from "./meta.cli";
import { OptionsCli } from "./options.cli";
import { PostCli } from "./post.cli";
import { ReplCli } from "./repl.cli";
import { RolesCli } from "./roles.cli";
import { SiteCli } from "./site.cli";
import { TermCli } from "./term.cli";
import { UserCli } from "./user.cli";
import { getChalk } from "./utils";
import { AppPwdCli } from "./apppwd.cli";

export class Clis {
  static map = new Map<string, Constructor>();
  static register(constructors: Constructor[]) {
    constructors.forEach((constructor: any) => {
      Clis.map.set(constructor.__cmd, constructor);
    });
  }

  static unregisterAll() {
    Clis.map.clear();
  }

  static hasHelpFlag(argv: string[]) {
    return argv.includes("--help") || argv.includes("-h");
  }

  static async displayHelp() {
    const chalk = await getChalk();

    console.log(chalk.bold("Usage:"), "<command> <subcommand> [options]");
    console.log();
    console.log(chalk.bold("Commands:"));
    for (const [key, value] of Clis.map.entries()) {
      // Display the command name, tab space and description
      const spaces = key.length < 15 ? " ".repeat(15 - key.length) : " ";
      console.log("  ", key, spaces, (value as any).description ?? "");
    }
  }

  static async displaySubCommandsHelp(
    cmd: string,
    methodMap: Map<string, { propertyKey: string; description?: string }>
  ) {
    const chalk = await getChalk();
    console.log(chalk.bold("Usage:"), `${cmd} <subcommand> [options]`);
    console.log();
    console.log(chalk.bold("Subcommands:"));
    for (const [key, value] of methodMap.entries()) {
      // Display the subcommand name, tab space and description
      const spaces = key.length < 15 ? " ".repeat(15 - key.length) : " ";
      console.log("  ", key, spaces, value.description ?? "");
    }
  }

  private static getCommand(version: string, description: string) {
    const program = new Command();

    program
      .version(version ?? "NaN")
      .description(description ?? "")
      .option(
        "-j --configJson <config>",
        "Enter the json string to be processed"
      )
      .option(
        "-c, --config <path>",
        `Enter the directory to the config file (default: ${CONFIG_DIR})`,
        CONFIG_DIR
      )
      .option("-a --assumedUser <userId>", "The user id to assume", "1")
      .option("-F --fields <fields>", "Fields to output", undefined)
      .option(
        "-Z --outputFormat <format>",
        "Output format (json|table|csv|raw)",
        "json"
      )
      .option(
        "-E, --environment <environment>",
        "Specify the environment for the .env file (.env.<environment>)"
      );

    // Override the exit behavior in the REPL to prevent the process from exiting
    if (process.env.REPL) {
      program.exitOverride();
    }

    return program;
  }

  static async executeCommand(argv: string[]) {
    let commandIndex = -1;
    let subCommandIndex = -1;

    for (let i = 0; i < argv.length; i++) {
      if (Clis.map.get(argv[i])) {
        commandIndex = i;
        subCommandIndex = i + 1;
        break;
      }
    }

    if (commandIndex === -1 || subCommandIndex === -1) {
      // Check if the help flag is present
      if (Clis.hasHelpFlag(argv)) {
        return void (await Clis.displayHelp());
      }
      throw new Error("Command not found");
    }

    const clazz: any = Clis.map.get(argv[commandIndex]);

    if (!clazz) {
      throw new Error("Command not found");
    }

    // When passging the argv to the constructor, remove the command and subcommand.
    // This ensures that the arguments are parsed correctly in the subcommand method.
    const instance = new clazz([
      argv[0],
      argv[1],
      ...argv.slice(subCommandIndex + 1),
    ]);

    const methodMap = Reflect.getMetadata(
      REFLECT_METADATA_KEY_SUBCOMMAND,
      instance
    );

    if (!methodMap) {
      throw new Error("Subcommands not found");
    }

    let value:
      | {
          propertyKey: string;
          description?: string;
          multisite?: boolean;
          persistent?: boolean;
        }
      | undefined = methodMap.get(argv[subCommandIndex]);

    if (!value) {
      value = methodMap.get("default");

      // If the subcommand is not found, reset the subcommand index
      // and reset the argv by just removing the command
      subCommandIndex = -1;
      value &&
        instance.resetArgv([argv[0], argv[1], ...argv.slice(commandIndex)]);
    }

    if (!value) {
      if (this.hasHelpFlag(argv)) {
        return void (await Clis.displaySubCommandsHelp(clazz.__cmd, methodMap));
      }
      throw new Error("Subcommand not found");
    }

    const program = Clis.getCommand(clazz.version, value.description ?? "");

    // Set the program name to the command and subcommand
    program.name(
      `${argv[commandIndex]} ${
        subCommandIndex > 0 ? argv[subCommandIndex] : ""
      }`
    );

    // Set multisite flag
    instance.multisite = true === clazz.multisite || true === value.multisite;

    // Call the subcommand method and get the result
    const result = await instance[value.propertyKey](program);

    // Flush the database connection if the subcommand is not persistent.
    if (true !== value.persistent) {
      instance.flush();
    }

    return result;
  }
}

// Register default clis
Clis.register([
  AppPwdCli,
  BlogCli,
  CommentCli,
  ConfigsCli,
  InitCli,
  InstallCli,
  MetaCli,
  OptionsCli,
  PostCli,
  ReplCli,
  RolesCli,
  SiteCli,
  TermCli,
  UserCli,
]);
