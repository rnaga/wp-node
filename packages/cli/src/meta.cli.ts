import { Command } from "commander";

import Application from "@rnaga/wp-node/application";
import { Context } from "@rnaga/wp-node/core/context";
import { command, subcommand } from "./decorators";
import * as vals from "@rnaga/wp-node/validators";
import { Cli } from "./cli";

import type * as types from "@rnaga/wp-node/types";

@command("meta", {
  description: "Meta commands (post, comment, blog, term, user, site)",
  version: "1.0.0",
})
export class MetaCli extends Cli {
  private validateMetaType(metaType: types.MetaTable, context: Context) {
    if (!context.config.isMultiSite() && ["blog", "site"].includes(metaType)) {
      this.output("error", "Multisite is not enabled");
      return false;
    }
    return true;
  }

  @subcommand("get", { description: "Get a meta by id" })
  async get(program: Command) {
    program
      .argument(
        "<metaType>",
        "Meta Table Type (post, comment, blog, term, user, site)"
      )
      .argument("<metaId>", "The meta id of the meta")
      .option("-M --more", "Get more information about the meta");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const metaType = this.command.getArg(0, vals.helpers.stringMetaTable);
    if (!metaType) {
      this.output("error", "Invalid or missing metaType");
      return;
    }
    if (!this.validateMetaType(metaType, context)) {
      return;
    }

    const metaId = this.command.getArg(1, vals.helpers.number);

    const meta = await context.utils.crud.meta.get(metaType, metaId!);

    if (!meta.data) {
      this.output("error", "Meta not found");
      return;
    }

    this.output("info", {
      message: `Meta found - metaId: ${this.options.metaId}`,
      data: meta.data,
    });

    return meta;
  }

  @subcommand("list", { description: "List metas" })
  async list(program: Command) {
    program
      .argument(
        "<metaType>",
        "Meta Table Type (post, comment, blog, term, user, site)"
      )
      .option("-S --search <search>", "Search for metas")
      .option("-X --exclude <exclude...>", "Exclude meta ids (space separated)")
      .option("-i --include <include...>", "Include meta ids (space separated)")
      .option("-u --unserialize", "Unserialize meta values")
      .option(
        "-o --orderby <orderby>",
        "Order by field (meta_id, meta_key, meta_value)",
        "meta_id"
      )
      .option("-O --order <order>", "desc or asc", "asc")
      .option("-g --page <page>", "Page number")
      .option("-P --perpage <perpage>", "Metas per page");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const metaType = this.command.getArg(0, vals.helpers.stringMetaTable);
    if (!this.validateMetaType(metaType!, context)) {
      return;
    }

    const metas = await context.utils.crud.meta.list(
      metaType!,
      {
        search: this.options.search,
        include: this.options.include?.join(","),
        exclude: this.options.exclude?.join(","),
        page: this.options.page,
        per_page: this.options.perpage,
        order: this.options.order,
        orderby: this.options.orderby,
      },
      {
        unserialize: this.options.unserialize,
      }
    );

    if (!metas.data) {
      this.output("error", "Metas not found");
      return;
    }

    this.output("info", {
      message: `Metas found`,
      data: metas.data,
    });

    return metas;
  }

  @subcommand("upsert", { description: "Upsert a meta" })
  async upsert(program: Command) {
    program
      .argument(
        "<metaType>",
        "Meta Table Type (post, comment, blog, term, user, site)"
      )
      .requiredOption("-k --metaKey <metaKey>", "The meta key")
      .requiredOption("-v --metaValue <metaValue>", "The meta value")
      .requiredOption(
        "-i --objectId <objectId>",
        "The object id associated with the meta (post_id, comment_id, blog_id, term_id, user_id, site_id)"
      );

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const metaType = this.command.getArg(0, vals.helpers.stringMetaTable);
    if (!this.validateMetaType(metaType!, context)) {
      return;
    }

    const result = await context.utils.crud.meta.update(
      metaType!,
      parseInt(this.options.objectId),
      {
        [this.options.metaKey]: this.options.metaValue,
      },
      "sync"
    );

    if ((typeof result.data === "number" && 0 >= result.data) || !result.data) {
      this.output("error", "Meta not created");
      return;
    }

    this.output("info", {
      message: `Meta upserted - objectId: ${result.info}`,
      data: result,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete a meta" })
  async delete(program: Command) {
    program
      .argument(
        "<metaType>",
        "Meta Table Type (post, comment, blog, term, user, site)"
      )
      .requiredOption("-i --objectId <objectId>", "The object id of the meta")
      .requiredOption("-k --metaKey <metaKey>", "The meta key");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const metaType = this.command.getArg(0, vals.helpers.stringMetaTable);
    if (!this.validateMetaType(metaType!, context)) {
      return;
    }

    const result = await context.utils.crud.meta.delete(
      metaType!,
      parseInt(this.options.objectId),
      [this.options.metaKey]
    );

    if (!result.data) {
      this.output("error", "Meta not deleted");
      return;
    }

    this.output("info", {
      message: `Meta deleted - objectId: ${this.options.objectId} metaKey: ${this.options.metaKey}`,
      data: result,
    });

    return result;
  }
}
