import "reflect-metadata";

import { command, subcommand } from "./decorators";
import { Cli } from "./cli";
import { postStatusConfig } from "./configs/post-status.config";
import { postTypeConfig } from "./configs/post-type.config";
import { taxonomyConfig } from "./configs/taxonomy.config";
import { wpConfig } from "./configs/wp.config";

import type { CliConfig } from "./configs/types";

@command("config", { description: "Generate WP config files" })
export class ConfigsCli extends Cli {
  private runConfigCli(fn: CliConfig) {
    const { program, prompts, generate } = fn();
    program
      .parseAsync(this.argv)
      .then(() => {
        const options = program.opts();
        return prompts(options); // Always ensure options are complete before proceeding
      })
      .then(generate)
      .catch((e: any) => {
        console.error(e);
        program.help();
      });
  }

  @subcommand("taxonomy", {
    description: "Generate a config file for taxonomy",
  })
  async taxonomy() {
    this.runConfigCli(taxonomyConfig);
  }

  @subcommand("postType", {
    description: "Generate a config file for post type",
  })
  async postType() {
    this.runConfigCli(postTypeConfig);
  }

  @subcommand("postStatus", {
    description: "Generate a config file for post status",
  })
  async postStatus() {
    this.runConfigCli(postStatusConfig);
  }

  @subcommand("default", { description: "Generate a config file for WP" })
  async default() {
    this.runConfigCli(wpConfig);
  }
}
