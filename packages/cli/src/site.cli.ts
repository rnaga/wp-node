import { Command } from "commander";
import { prompt } from "enquirer";

import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import * as vals from "@rnaga/wp-node/validators";
import { Cli } from "./cli";

@command("site", {
  description: "Site commands",
  version: "1.0.0",
  multisite: true,
})
export class SiteCli extends Cli {
  @subcommand("get", { description: "Get a site" })
  async get(program: Command) {
    program.argument("<site>", "The site name (e.g. example.com)");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const siteId = this.command.getArg(0, vals.helpers.number);

    const result = await context.utils.crud.site.get(siteId!);

    if (!result.data) {
      this.output("error", `Site not found - ${this.options.site}`);
      return;
    }

    this.output("info", {
      message: `Site found - ${result.data.domain}`,
      data: result.data,
    });

    return result.data;
  }

  @subcommand("create", { description: "Create a site" })
  async create(program: Command) {
    program
      .requiredOption("-d --domain <domain>", "The domain of the site")
      .requiredOption("-n --name <name>", "The name of the site")
      .option("-P --path <path>", "The path of the site", "/")
      .option("-s --subdomainInstall", "Allow subdomain install", false);

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.site.create(
      {
        domain: this.options.domain,
        siteName: this.options.name,
        path: this.options.path,
      },
      {
        subdomainInstall: this.options.subdomainInstall,
      }
    );

    if (!result.data.siteId) {
      this.output("error", "Failed to create site");
      return;
    }

    this.output("info", {
      message: `Site created - ${result.data.siteId}`,
      data: result.data,
    });

    return result.data;
  }

  @subcommand("update", { description: "Update a site" })
  async update(program: Command) {
    program
      .argument("<siteId>", "The site id of the site")
      .option("-d --domain <domain>", "The domain of the site")
      .option("-P --path <path>", "The path of the site");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const siteId = this.command.getArg(0, vals.helpers.number);

    const result = await context.utils.crud.site.update(siteId!, {
      domain: this.options.domain,
      path: this.options.path,
    });

    if (!result.data) {
      this.output("error", `Failed to update site - ${siteId}`);
      return;
    }

    this.output("info", {
      message: `Site updated - ${siteId}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete a site" })
  async delete(program: Command) {
    program
      .argument("<siteId>", "The site id of the site")
      .option(
        "-n --newSiteId <newSiteId>",
        "The new site id to replace the deleted site"
      )
      .option("-y --yes", "Skip the confirmation prompt");

    await this.settings({ program });

    const siteId = this.command.getArg(0, vals.helpers.number);

    const promptResponse = await prompt<{
      yes: boolean;
    }>([
      {
        type: "confirm",
        name: "yes",
        message: `Procceed? delete site: ${siteId}`,
        initial: this.options.yes ?? undefined,
        skip: this.options.yes !== undefined,
      },
    ]);

    if (!promptResponse.yes) {
      this.output("info", "Aborted");
      return false;
    }

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const newSiteId = this.command.getOption("newSiteId", vals.helpers.number);

    const result = await context.utils.crud.site.delete(siteId!, {
      newSiteId,
    });

    if (!result.data) {
      this.output("error", `Failed to delete site - ${siteId}`);
      return;
    }

    this.output("info", {
      message: `Site deleted - ${siteId}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("list", { description: "List sites" })
  async list(program: Command) {
    program
      .option("-o --orderby <orderby>", "Order by field (id, domain, path)")
      .option("-O --order <order>", "desc or asc", "asc")
      .option("-p --page <page>", "Page number")
      .option("-P --perpage <perpage>", "Sites per page")
      .option("-S --search <search>", "Search for sites");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.site.list({
      orderby: this.options.orderby,
      order: this.options.order,
      page: this.options.page,
      per_page: this.options.perpage,
      search: this.options.search,
    });

    if (!result.data.length) {
      this.output("error", "Sites not found");
      return;
    }

    this.output("info", {
      message: `Sites found - count: ${result.info.pagination.count}`,
      data: result.data,
    });

    return result;
  }
}
