#!/usr/bin/env node

import "reflect-metadata";

import { Command, CommanderError } from "commander";
import nodeRepl from "repl";

import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import { Cli } from "./cli";
import { Clis } from "./clis";

import type { REPLServer } from "repl";

@command("repl", { description: "Start a REPL", version: "1.0.0" })
export class ReplCli extends Cli {
  static excludedCommands = ["config", "init", "install"];
  static set excludeFromCommands(constructor: any | any[]) {
    (!Array.isArray(constructor) ? [constructor] : constructor).forEach((c) => {
      ReplCli.excludedCommands.push(c.__cmd);
    });
  }

  private static defineCommands(r: REPLServer) {
    // Check if the command is excluded from the REPL
    Clis.map.forEach((clazz: any) => {
      if (
        clazz.__cmd === "repl" ||
        ReplCli.excludedCommands.includes(clazz.__cmd)
      ) {
        return;
      }

      // Define the command in the REPL
      r.defineCommand(clazz.__cmd, {
        help: clazz.description,
        async action(...argvs: string[]) {
          const argv = [
            clazz.__cmd,
            ...argvs.map((arg) => arg.split(" ")).flat(),
          ];
          try {
            await Clis.executeCommand(argv);
          } catch (error) {
            if (
              error instanceof CommanderError &&
              error.code === "commander.helpDisplayed"
            ) {
              console.log(error.message);
              return;
            }
            console.error(error);
          } finally {
            r.displayPrompt();
          }
        },
      });
    });
  }

  @subcommand("default", { description: "A tool for REPL", persistent: true })
  async default(program: Command) {
    const initializeContext = (context: REPLServer["context"]) => {
      (async () => {
        await this.settings({ program });
        const wp = await Application.getContext();

        await wp.current.assumeUser(this.assumedUserId);

        // Attach the App context to the REPL context
        context.wp = wp;
      })();
    };

    // Set the REPL environment variable to keep database connections open
    process.env.REPL = "true";

    const r = nodeRepl.start({ prompt: "wp-node> " });
    initializeContext(r.context);

    ReplCli.defineCommands(r);

    r.on("reset", initializeContext);
  }
}
