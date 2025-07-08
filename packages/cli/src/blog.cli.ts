import { Command } from "commander";
import { prompt } from "enquirer";

import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import * as vals from "@rnaga/wp-node/validators";
import { Cli } from "./cli";

import { z } from "zod";

@command("blog", {
  description: "Blog commands",
  version: "1.0.0",
  multisite: true,
})
export class BlogCli extends Cli {
  @subcommand("get", { description: "Get a blog by id" })
  async get(program: Command) {
    program.argument("<blogId>", "The blog id of the blog");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const blogId = this.command.getArg(0, vals.helpers.number);

    const result = await context.utils.crud.blog.get(blogId);

    if (!result.data) {
      this.output("error", "Blog not found");
      return;
    }

    this.output("info", {
      message: `Blog found - ${result.data.blogname}`,
      data: result.data,
    });

    return result.data;
  }

  @subcommand("list", { description: "List blogs" })
  async list(program: Command) {
    program
      .option(
        "-o --orderby <orderby>",
        "Order by field (blog_id, domain, path, url, registered, last_updated)",
        "blog_id"
      )
      .option("-O --order <order>", "desc or asc", "asc")
      .option("-p --page <page>", "Page number")
      .option("-P --perpage <perpage>", "Blogs per page")
      .option("-S --search <search>", "Search for blogs");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.blog.list({
      orderby: this.options.orderby,
      order: this.options.order,
      page: this.options.page,
      per_page: this.options.perpage,
      search: this.options.search,
    });

    if (!result.data.length) {
      this.output("error", "Blogs not found");
      return;
    }

    this.output("info", {
      message: `Blogs found - count: ${result.info.pagination.count}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("create", { description: "Create a blog" })
  async create(program: Command) {
    program
      .requiredOption("-d --domain <domain>", "The domain of the blog")
      .requiredOption("-t --title <title>", "The title of the blog")
      .option("-u --user <user>", "The user id of the blog owner")
      .option("-p --path <path>", "The path of the blog");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const userId = this.options.user
      ? this.command.getOption("user", vals.helpers.number)
      : context.current.user?.props?.ID;

    if (!userId) {
      this.output("error", "User not found");
      return;
    }

    const result = await context.utils.crud.blog.create({
      domain: this.options.domain,
      title: this.options.title,
      path: this.options.path,
      user_id: userId,
    });

    if (!result.data) {
      this.output("error", "Blog not created");
      return;
    }

    this.output("info", {
      message: `Blog created - blogId: ${result.data}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("update", { description: "Update a blog" })
  async update(program: Command) {
    program
      .argument("<blogId>", "The blog id of the blog")
      .option("-d --domain <domain>", "The domain of the blog")
      .option("-p --path <path>", "The path of the blog");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const blogId = this.command.getArg(0, vals.helpers.number);
    const blog = await context.utils.crud.blog.get(blogId);

    if (!blog.data) {
      this.output("error", "Blog not found");
      return;
    }

    const result = await context.utils.crud.blog.update(blogId, {
      domain: this.options.domain ?? blog.data.domain,
      path: this.options.path ?? blog.data.path,
    });

    if (!result.data) {
      this.output("error", "Failed to update blog");
      return;
    }

    this.output("info", {
      message: `Blog updated - blogId: ${blogId}`,
      data: result,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete a blog" })
  async delete(program: Command) {
    program
      .argument("<blogId>", "The blog id of the blog")
      .option("-y --yes", "Skip the confirmation prompt");

    await this.settings({ program });

    const blogId = this.command.getArg(0, vals.helpers.number);

    const promptResponse = await prompt<{
      yes: boolean;
    }>([
      {
        type: "confirm",
        name: "yes",
        message: `Procceed? delete blog: ${blogId}`,
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

    const result = await context.utils.crud.blog.delete(blogId);

    if (!result.data) {
      this.output("error", "Failed to delete blog");
      return;
    }

    this.output("info", {
      message: `Blog deleted - blogId: ${blogId}`,
      data: result,
    });

    return result;
  }

  @subcommand("flag", {
    description:
      "Activate or deactivate a flag on a blog (public, archived, mature, spam, deleted)",
  })
  async flag(program: Command) {
    program
      .argument("<blogId>", "The blog id of the blog")
      .argument(
        "<flag>",
        "The flag to set (public, archived, mature, spam, deleted)"
      )
      .argument("<on|off>", "Activate or deactivate the flag");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const blogId = this.command.getArg(0, vals.helpers.number);
    const blog = await context.utils.crud.blog.get(blogId);

    if (!blog.data) {
      this.output("error", "Blog not found");
      return;
    }

    const flag = this.command.getArg(1, vals.helpers.blogFlag);
    const activate = this.command.getArg(2, z.enum(["on", "off"]));

    const result = await context.utils.crud.blog.update(blogId, {
      [flag]: activate == "on" ? 1 : 0,
    });

    if (!result.data) {
      this.output("error", "Failed to update blog flag");
      return;
    }

    this.output("info", {
      message: `Blog flag updated (${activate}) - blogId: ${blogId} flag: ${flag}`,
      data: result.data,
    });

    return result;
  }
}
