import { Command } from "commander";

import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "@rnaga/wp-node-cli/decorators";
import { Cli } from "@rnaga/wp-node-cli/cli";

@command("page", { description: "Page commands", version: "1.0.0" })
export class PageCli extends Cli {
  @subcommand("list", { description: "List pages" })
  async list(program: Command) {
    program
      .option("-P --perpage <perpage>", "Pages per page")
      .option("-S --search <search>", "Search for pages");

    // Avoid error: too many arguments.
    // https://github.com/tj/commander.js/blob/master/CHANGELOG.md#1300-2024-12-30
    program.allowExcessArguments();

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.post.list(
      {
        per_page: this.options.perpage,
        search: this.options.search,
      },
      {
        postTypes: ["page"],
      }
    );

    if (!result.data.length) {
      this.output("error", "Pages not found");
      return;
    }

    this.output("info", {
      message: `Pages found - count: ${result.info.pagination.count}`,
      data: result.data,
    });

    return result;
  }
}
