import { Command } from "commander";
import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import { Cli } from "./cli";

import * as vals from "@rnaga/wp-node/validators";
import * as types from "@rnaga/wp-node/types";

@command("term", { description: "Term commands", version: "1.0.0" })
export class TermCli extends Cli {
  @subcommand("get", {
    description: "Get a term by id and taxonomy",
  })
  async get(program: Command) {
    program
      .argument("taxonomy", "The taxonomy of the term")
      .option("-i --termId <termId>", "The term id of the term")
      .option("-n --name <name>", "The name of the term");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const taxonomy = this.command.getArg(0, vals.helpers.string);

    let termId: number = this.options.termId
      ? parseInt(this.options.termId)
      : 0;

    if (this.options.name) {
      const term = await context.utils.query.terms((query) => {
        query
          .whereIn("name", [this.options.name])
          .where("taxonomy", taxonomy as types.TaxonomyName)
          .builder.limit(1);
      });

      if (!term) {
        this.output("error", "Term not found");
        return;
      }

      termId = term[0].term_id;
    }

    const term = await context.utils.term.get(
      termId,
      taxonomy as types.TaxonomyName
    );

    if (!term.props) {
      this.output("error", "Term not found");
      return;
    }

    this.output("info", {
      message: `Term found - termId: ${term.props.term_id}`,
      data: term.props,
    });

    return term;
  }

  @subcommand("list", { description: "List all terms" })
  async list(program: Command) {
    program
      .argument("<taxonomy>", "The taxonomy of the term")
      .option(
        "-o --orderby <orderby>",
        "Order by field (term_id, name, slug, term_group, description)"
      )
      .option("-O --order <order>", "desc or asc", "asc")
      .option("-p --page <page>", "Page number")
      .option("-P --perpage <perpage>", "Terms per page")
      .option("-S --search <search>", "Search for terms");

    await this.settings({ program });

    const taxonomy = this.command.getArg(0, vals.helpers.string);

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.term.list(
      taxonomy as types.TaxonomyName,
      {
        per_page: this.options.perpage,
        page: this.options.page,
        orderby: this.options.orderby,
        order: this.options.order,
        search: this.options.search,
      }
    );

    if (!result.data.length) {
      this.output("error", "Terms not found");
      return;
    }

    this.output("info", {
      message: `Terms found - count: ${result.info.pagination.count}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("create", { description: "Create a new term" })
  async create(program: Command) {
    program
      .argument("<taxonomy>", "The taxonomy of the term")
      .argument("<name>", "The name of the term")
      .option("-s --slug <slug>", "The slug of the term")
      .option("-d --description <description>", "The description of the term")
      .option("-p --parent <parent>", "The parent term id of the term");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const taxonomy = this.command.getArg(0, vals.helpers.string);
    const termName = this.command.getArg(1, vals.helpers.string);

    const result = await context.utils.crud.term.create({
      taxonomyName: taxonomy as types.TaxonomyName,
      name: termName!,
      description: this.options.description,
      parent: this.options.parent ? parseInt(this.options.parent) : undefined,
      slug: this.options.slug,
    });

    this.output("info", {
      message: `Term created - termId: ${result.data.term_id}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("update", { description: "Update a term" })
  async update(program: Command) {
    program
      .argument("<taxonomy>", "The taxonomy of the term")
      .argument("<termId>", "The term id of the term")
      .option("-n --name <name>", "The name of the term")
      .option("-s --slug <slug>", "The slug of the term")
      .option("-d --description <description>", "The description of the term")
      .option("-p --parent <parent>", "The parent term id of the term");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const taxonomy = this.command.getArg(0, vals.helpers.string);
    const termId = this.command.getArg(1, vals.helpers.number);

    const result = await context.utils.crud.term.update(
      termId!,
      taxonomy as types.TaxonomyName,
      {
        name: this.options.name,
        description: this.options.description,
        parent: this.options.parent ? parseInt(this.options.parent) : undefined,
        slug: this.options.slug,
      }
    );

    this.output("info", {
      message: `Term updated - termId: ${termId}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete a term" })
  async delete(program: Command) {
    program
      .argument("<taxonomy>", "The taxonomy of the term")
      .argument("<termId>", "The term id of the term");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const taxonomy = this.command.getArg(0, vals.helpers.string);
    const termId = this.command.getArg(1, vals.helpers.number);

    const result = await context.utils.crud.term.delete(
      termId!,
      taxonomy as types.TaxonomyName
    );

    this.output("info", {
      message: `Term deleted - termId: ${termId}`,
      data: result.data,
    });

    return result;
  }
}
