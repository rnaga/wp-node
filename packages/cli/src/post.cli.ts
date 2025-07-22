import { Command } from "commander";

import Application from "@rnaga/wp-node/application";
import { command, subcommand } from "./decorators";
import * as vals from "@rnaga/wp-node/validators";
import { Cli } from "./cli";

@command("post", { description: "Post commands", version: "1.0.0" })
export class PostCli extends Cli {
  @subcommand("get", { description: "Get a post by id" })
  async get(program: Command) {
    program
      .argument("<postId>", "The post id of the blog")
      .option("-M --more", "Get more information about the post");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const postId = this.command.getArg(0, vals.helpers.number);
    const post = await context.utils.post.get(postId!);

    if (!post.props) {
      this.output("error", "Post not found");
      return;
    }

    const result = await context.utils.crud.post.get(postId!, {
      context: this.options.more ? "edit" : "view",
    });

    this.output("info", {
      message: `Post found - postId: ${post.props.ID}`,
      data: result.data,
    });

    return post;
  }

  @subcommand("create", { description: "Create a post" })
  async create(program: Command) {
    program
      .requiredOption("-t --title <title>", "The title of the post")
      .requiredOption("-C --content <content>", "The content of the post")
      .option("-N --name <name>", "The name of the post")
      .option("-A --author <author>", "The author of the post", "1")
      .option("-T --postType <postType>", "The type of the post", "post")
      .option("-e --excerpt <excerpt>", "The excerpt of the post", "")
      .option("-s --postStatus <postStatus>", "The status of the post", "draft")
      .option("-G --guid <guid>", "The guid of the post")
      .option(
        "-m --commentStatus <commentStatus>",
        "The comment status of the post",
        "open"
      )
      .option("-P --postPassword <postPassword>", "The password of the post");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.post.create({
      post_title: this.options.title,
      post_name: this.options.name,
      post_content: this.options.content,
      guid: this.options.guid,
      post_status: this.options.postStatus,
      post_author: parseInt(this.options.author),
      post_type: this.options.postType,
      post_excerpt: this.options.excerpt,
      comment_status: this.options.commentStatus,
      post_password: this.options.postPassword,
    });

    if (!result.data) {
      this.output("error", "Failed to create post");
      return;
    }

    this.output("info", {
      message: `Post created - postId: ${result.data}`,
      data: result,
    });

    return result;
  }

  @subcommand("update", { description: "Update a post" })
  async update(program: Command) {
    program
      .argument("<postId>", "The post id of the blog")
      .option("-t --title <title>", "The title of the post")
      .option("-C --content <content>", "The content of the post")
      .option("-N --name <name>", "The name of the post")
      .option("-A --author <author>", "The author of the post", "1")
      .option("-T --postType <postType>", "The type of the post", "post")
      .option("-e --excerpt <excerpt>", "The excerpt of the post", "")
      .option("-s --postStatus <postStatus>", "The status of the post", "draft")
      .option("-G --guid <guid>", "The guid of the post")
      .option(
        "-m --commentStatus <commentStatus>",
        "The comment status of the post",
        "open"
      )
      .option("-P --postPassword <postPassword>", "The password of the post");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const postId = this.command.getArg(0, vals.helpers.number);
    const post = await context.utils.post.get(postId!);

    if (!post.props) {
      this.output("error", "Post not found");
      return;
    }

    const result = await context.utils.crud.post.update(postId!, {
      post_title: this.options.title ?? post.props.post_title,
      post_name: this.options.name ?? post.props.post_name,
      post_content: this.options.content ?? post.props.post_content,
      guid: this.options.guid ?? post.props.guid,
      post_status: this.options.postStatus ?? post.props.post_status,
      post_author: parseInt(this.options.author ?? post.props.post_author),
      post_type: this.options.postType ?? post.props.post_type,
      post_excerpt: this.options.excerpt ?? post.props.post_excerpt,
      comment_status: this.options.commentStatus ?? post.props.comment_status,
      post_password: this.options.postPassword,
    });

    if (!result.data) {
      this.output("error", "Failed to update post");
      return;
    }

    this.output("info", {
      message: `Post updated - postId: ${this.options.postId}`,
      data: result,
    });

    return result;
  }

  @subcommand("delete", { description: "Delete a post" })
  async delete(program: Command) {
    program
      .argument("<postId>", "The post id of the blog")
      .option("-f --force", "Force delete the post");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const postId = this.command.getArg(0, vals.helpers.number);

    const result = this.options.force
      ? await context.utils.crud.post.delete(postId!)
      : await context.utils.crud.post.trash(postId!);

    if (!result.data) {
      this.output("error", "Failed to delete post");
      return;
    }

    this.output("info", {
      message: `Post deleted - postId: ${this.options.postId}`,
      data: result,
    });

    return result;
  }

  @subcommand("list", { description: "List posts" })
  async list(program: Command) {
    program
      .option("-A --author <author>", "The author of the post")
      .option("-p --postId <postId...>", "The post ids of the blog")
      .option("-t --postType <postType>", "The type of the post", "post")
      .option("-s --postStatus <postStatus>", "The status of the post")
      .option(
        "-o --orderby <orderby>",
        "Order by field (post_author, post_date, ID, post_modified, post_parent, post_name, post_title)",
        "ID"
      )
      .option("-O --order <order>", "desc or asc", "asc")
      .option("-g --page <page>", "Page number")
      .option("-P --perpage <perpage>", "Posts per page")
      .option("-S --search <search>", "Search for posts");

    await this.settings({ program });

    const context = await Application.getContext();
    await context.current.assumeUser(this.assumedUserId);

    const result = await context.utils.crud.post.list(
      {
        author: this.command.getOption("author", vals.helpers.numberArr),
        status: this.options.postStatus ? [this.options.postStatus] : undefined,
        include: this.options.postId?.join(","),
        orderby: this.options.orderby,
        order: this.options.order,
        page: this.options.page,
        per_page: this.options.perpage,
        search: this.options.search,
      },
      {
        postTypes: [this.options.postType],
      }
    );

    if (!result.data.length) {
      this.output("error", "Posts not found");
      return;
    }

    this.output("info", {
      message: `Posts found - count: ${result.info.pagination.count}`,
      data: result.data,
    });
    //}

    return result;
  }
}
