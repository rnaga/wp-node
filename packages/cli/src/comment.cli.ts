import { Command } from "commander";

import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import * as vals from "@rnaga/wp-node/validators";
import { Cli } from "./cli";

@command("comment", { description: "Comment commands", version: "1.0.0" })
export class CommentCli extends Cli {
  @subcommand("get", { description: "Get a comment by id" })
  async get(program: Command) {
    program
      .argument("<commentId>", "The comment id of the comment")
      .option("-M --more", "Get more information about the comment");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const commentId = this.command.getArg(0, vals.helpers.number);
    const comment = await context.utils.comment.get(commentId!);

    if (!comment.props) {
      this.output("error", "Comment not found");
      return;
    }

    const result = await context.utils.crud.comment.get(commentId!, {
      context: this.options.more === true ? "edit" : "view",
    });

    this.output("info", {
      message: `Comment found - commentId: ${comment.props.comment_ID}`,
      data: result.data,
    });

    return comment;
  }

  @subcommand("list", { description: "List comments" })
  async list(program: Command) {
    program
      .option("-p --postId <postId...>", "The post id of the comment")
      .option("-A --author <author...>", "The author of the comment")
      .option("-i --include <include...>", "The comment IDs to include")
      .option("-s --status <status>", "The status of the comment")
      .option("-t --parent <parent...>", "The parent id of the comment")
      .option("-S --search <search>", "Search for comments")
      .option(
        "-o --orderby <orderby>",
        "Order by field (comment_author,comment_date,omment_date_gmt, comment_ID,comment_post_ID,comment_parent,comment_type"
      )
      .option("-O --order <order>", "desc or asc", "asc")
      .option("-g --page <page>", "Page number")
      .option("-P --perpage <perpage>", "Posts per page");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.comment.list({
      post: this.options.postId?.join(","),
      author: this.options.author?.join(","),
      include: this.options.include?.join(","),
      status: this.options.status,
      parent: this.options.parent?.join(","),
      search: this.options.search,
      orderby: this.options.orderby,
      order: this.options.order,
      page: this.options.page,
      per_page: this.options.perpage,
    });

    if (!result.data.length) {
      this.output("error", "Comments not found");
      return;
    }

    this.output("info", {
      message: `Comments found - count: ${result.info.pagination.count}`,
      data: result.data,
    });

    return result;
  }

  @subcommand("create", { description: "Create a comment" })
  async create(program: Command) {
    program
      .requiredOption("-p --postId <postId>", "The post id of the comment")
      .requiredOption("-C --content <content>", "The content of the comment")
      .option("-A --author <author>", "The author of the comment")
      .option("-t --type <type>", "The type of the comment", "comment")
      .option("-s --status <status>", "The status of the comment", "1")
      .option("-P --parent <parent>", "The parent id of the comment");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const postId = this.command.getOption("postId", vals.helpers.number);
    const content = this.command.getOption("content", vals.helpers.string);

    const result = await context.utils.crud.comment.create({
      comment_post_ID: postId,
      comment_content: content,
      comment_author: this.options.author,
      comment_type: this.options.type,
      comment_approved: this.options.status,
      comment_parent: this.options.parent,
    });

    if (!result.data) {
      this.output("error", "Failed to create comment");
      return;
    }

    this.output("info", {
      message: "Comment created",
      data: result.data,
    });

    return result;
  }

  @subcommand("update", { description: "Update a comment" })
  async update(program: Command) {
    program
      .argument("<commentId>", "The comment id of the comment")
      .option("-C --content <content>", "The content of the comment")
      .option("-A --author <author>", "The author of the comment")
      .option("-s --status <status>", "The status of the comment")
      .option("-P --parent <parent>", "The parent id of the comment");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const commentId = this.command.getArg(0, vals.helpers.number);
    const comment = await context.utils.comment.get(commentId!);

    if (!comment.props) {
      this.output("error", "Comment not found");
      return;
    }

    const result = await context.utils.crud.comment.update(commentId!, {
      comment_content: this.options.content,
      comment_author: this.options.author,
      comment_approved: this.options.status,
      comment_parent: this.options.parent,
      comment_type: comment.props.comment_type,
    });

    if (!result.data) {
      this.output("error", "Failed to update comment");
      return;
    }

    this.output("info", {
      message: "Comment updated",
      data: result.data,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete a comment" })
  async delete(program: Command) {
    program
      .argument("<commentId>", "The comment id of the comment")
      .option("-f --force", "Force delete the comment (skip trash)", false);

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const commentId = this.command.getArg(0, vals.helpers.number);
    const force = this.command.getOption("force", vals.helpers.boolean);

    const result = await context.utils.crud.comment.delete(commentId!, force);

    if (!result.data) {
      this.output("error", "Failed to delete comment");
      return;
    }

    this.output("info", {
      message: `Comment deleted - commentId: ${commentId}`,
    });

    return result;
  }
}
