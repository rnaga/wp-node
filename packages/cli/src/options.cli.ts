import { Command } from "commander";
import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { formatting } from "@rnaga/wp-node/common";
import { command, subcommand } from "./decorators";
import * as vals from "@rnaga/wp-node/validators";
import { Cli } from "./cli";

@command("option", { description: "Options commands", version: "1.0.0" })
export class OptionsCli extends Cli {
  @subcommand("get", { description: "Get an option by name" })
  async get(program: Command) {
    program.argument("<optionName>", "The option name to get");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const optionName = this.command.getArg(0, vals.helpers.string);
    const option = await context.options.get(optionName!);

    if (!option) {
      this.output("error", "Option not found");
      return;
    }

    this.output("info", {
      message: `Option found - optionName: ${optionName}`,
      data: option,
    });

    return option;
  }

  @subcommand("list", { description: "List all options" })
  async list(program: Command) {
    program
      .option("-S --search <search>", "Search for options")
      .option("-X --exclude <exclude>", "Exclude options")
      .option("-u --unserialize", "Unserialize option values")
      .option("-l --limit <limit>", "Limit the number of options returned");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const options = await context.utils.query.options((query) => {
      if (this.options.search) {
        query.from.whereLike("option_name", this.options.search);
      }

      if (this.options.exclude) {
        query.from.whereNotLike("option_name", this.options.exclude);
      }

      if (this.options.limit) {
        query.builder.limit(parseInt(this.options.limit));
      }
    }, z.array(vals.query.optionsResult));

    if (!options) {
      this.output("error", "Options not found");
      return;
    }

    let formattedOptions: (Omit<(typeof options)[number], "option_value"> & {
      option_value: any;
    })[] = options;

    if (this.options.unserialize) {
      formattedOptions = formattedOptions.map((option) => ({
        ...option,
        option_value: formatting.primitive(option.option_value),
      }));
    }

    this.output("info", { message: "Options found", data: formattedOptions });

    return formattedOptions;
  }

  @subcommand("upsert", { description: "Create an option" })
  async upsert(program: Command) {
    program
      .argument("<optionName>", "The name of the option")
      .argument("<optionValue>", "The value of the option")
      .option("-A --autoload", "The autoload value", true)
      .option("-S --serialize", "Serialize the option value")
      .option("-C --create", "Create the option only if it does not exist");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const optionName = this.command.getArg(0, vals.helpers.string);
    const optionValue = this.command.getArg(1);

    const result = await context.utils.trx.options.insert(
      optionName!,
      optionValue,
      {
        autoload: this.options.autoload ? "yes" : "no",
        upsert: this.options.create,
        seriazlie: this.options.serialize,
      }
    );

    if (!result) {
      this.output("error", "Option not created - probably already exists");
      return;
    }

    this.output("info", {
      message: `Option upserted - optionName: ${this.options.optionName} option_id: ${result}`,
      data: result,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete an option" })
  async delete(program: Command) {
    program.argument("<optionName>", "The name of the option");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const optionName = this.command.getArg(0, vals.helpers.string);
    const option = await context.options.get(optionName!);

    if ("undefined" === typeof option) {
      this.output("error", "Option not found");
      return false;
    }

    await context.utils.trx.options.remove(this.options.optionName);

    this.output("info", {
      message: `Option deleted - optionName: ${this.options.optionName}`,
    });

    return true;
  }
}
