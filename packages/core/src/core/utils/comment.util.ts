import { z } from "zod";

import { formatting } from "../../common";
import { Config } from "../../config";
import { component } from "../../decorators/component";
import * as val from "../../validators";
import { Comment } from "../comment";
import { Components } from "../components";
import { Options } from "../options";
import { Post } from "../post";
import { User } from "../user";
import { PostUtil } from "./post.util";
import { QueryUtil } from "./query.util";
import { UserUtil } from "./user.util";

import type * as types from "../../types";

@component()
export class CommentUtil {
  constructor(private components: Components, private config: Config) {}

  async get(id: number) {
    return await this.components.asyncGet(Comment, [id]);
  }

  toComment(comment: types.Tables["comments"]) {
    return this.components.get(Comment, [comment.comment_ID, comment]);
  }

  toComments(comments: types.Tables["comments"][]) {
    return comments.map((comment) => this.toComment(comment));
  }

  async getDefaultStatus(
    postType?: types.PostType,
    commentType?: string
  ): Promise<"open" | "closed">;
  async getDefaultStatus(
    postType?: string,
    commentType?: string
  ): Promise<"open" | "closed">;
  async getDefaultStatus(postType?: any, commentType?: any) {
    postType = postType ?? "post";
    commentType = commentType ?? "comment";

    const options = this.components.get(Options);
    const postTypeObjects = this.components
      .get(PostUtil)
      .getTypeObject(postType);

    let supports, option, status: "open" | "closed";
    switch (commentType) {
      case "pingback":
      case "trackback":
        supports = "trackbacks";
        option = "ping";
        break;
      default:
        supports = "comments";
        option = "comment";
        break;
    }

    // Set the status.
    if ("page" === postType) {
      status = "closed";
    } else if (postTypeObjects && postTypeObjects.supports.includes(supports)) {
      const defaultStatus = await options.get(`default_${option}_status`);
      status =
        defaultStatus === "open" || defaultStatus === "closed"
          ? defaultStatus
          : "closed";
    } else {
      status = "closed";
    }

    return status;
  }

  // wp_get_comment_status
  async getStatusAsString(commentId: number) {
    const comment = await this.get(commentId);

    if (!comment.props) {
      return "";
    }

    const approved = comment.props.comment_approved;

    if (!approved) {
      return "";
    }

    if ("1" === approved) {
      return "approved";
    }

    if ("0" === approved) {
      return "unapproved";
    }

    if ("spam" == approved || "trash" == approved) {
      return approved;
    }

    return "";
  }

  // comments_open
  isOpen(post: Post) {
    return post.props && "open" == post.props.comment_status;
  }

  // wp_check_comment_disallowed_list
  async containsNGWord(args: Partial<types.Tables["comments"]>) {
    const {
      comment_author: author = "",
      comment_author_email: email = "",
      comment_author_url: url = "",
      comment_content: content = "",
      comment_author_IP: authorIp = "",
      comment_agent: userAgent = "",
    } = args;

    const options = this.components.get(Options);
    const moderationKeys = await options.get<string>("disallowed_keys");

    if (!moderationKeys || 0 >= moderationKeys.length) {
      return false;
    }

    // Ensure HTML tags are not being used to bypass the list of disallowed characters and words.
    const commentWithoutHtml = formatting.stripTags(content);

    const escapeRegExp = (key: string): string => {
      // Escape special characters for use in a regular expression
      return key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    for (const key of moderationKeys.split("\n").map((key) => key.trim())) {
      // Skip empty lines.
      if (0 >= key.length) {
        continue;
      }

      // Do some escaping magic so that '#' chars in the spam words don't break things
      const pattern = new RegExp(escapeRegExp(key), "iu");
      if (
        pattern.test(author) ||
        pattern.test(email) ||
        pattern.test(url) ||
        pattern.test(content) ||
        pattern.test(commentWithoutHtml) ||
        pattern.test(authorIp) ||
        pattern.test(userAgent)
      ) {
        return true;
      }
    }
    return false;
  }

  // check_comment
  async isValid(args: Partial<types.Tables["comments"]>) {
    const {
      comment_author: author = "",
      comment_author_email: email = "",
      comment_author_url: url = "",
      comment_content: content = "",
      comment_author_IP: authorIp = "",
      comment_agent: userAgent = "",
      comment_type: commentType = "comment",
    } = args;

    const options = this.components.get(Options);

    // If manual moderation is enabled, skip all checks and return false.
    if (1 === (await options.get<number>("comment_moderation"))) {
      return false;
    }

    // Check for the number of external links if a max allowed number is set.
    const maxLinks = await options.get<number>("comment_max_links");
    if (maxLinks) {
      const regex: RegExp = /<a [^>]*href/gi;
      const numLinks = content.match(regex);

      if (numLinks && numLinks.length >= maxLinks) {
        return false;
      }
    }

    const moderationKeys = (
      await options.get<string>("moderation_keys")
    )?.trim();

    // If moderation 'keys' (keywords) are set, process them.
    if (moderationKeys) {
      const escapeRegExp = (key: string): string => {
        // Escape special characters for use in a regular expression
        return key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      for (const key of moderationKeys.split("\n").map((key) => key.trim())) {
        // Skip empty lines.
        if (0 >= key.length) {
          continue;
        }

        // - Escape the word to be used in the regex
        // - Create the regex pattern
        const pattern = new RegExp(escapeRegExp(key), "iu");

        for (const field of [
          author,
          email,
          url,
          content,
          authorIp,
          userAgent,
        ]) {
          if (pattern.test(field)) {
            return false;
          }
        }
      }

      /*
       * Check if the option to approve comments by previously-approved authors is enabled.
       *
       * If it is enabled, check whether the comment author has a previously-approved comment,
       * as well as whether there are any moderation keywords (if set) present in the author
       * email address. If both checks pass, return true. Otherwise, return false.
       */
      if (1 === (await options.get<number>("comment_previously_approved"))) {
        if (
          commentType === "trackback" ||
          commentType === "pingback" ||
          0 >= author.length ||
          0 >= email.length
        ) {
          return false;
        }

        const queryUtil = this.components.get(QueryUtil);
        const user = await queryUtil.users((query) => {
          query.where("user_email", formatting.unslash(email)).builder.first();
        }, val.database.wpUsers);

        let okToComment = false;
        if (user && user.ID) {
          okToComment = (await queryUtil.comments((query) => {
            query.where("user_id", user.ID).where("approved", "1");
          }))
            ? true
            : false;
        } else {
          okToComment = (await queryUtil.comments((query) => {
            query
              .where("author", author)
              .where("author_email", email)
              .where("approved", "1");
          }))
            ? true
            : false;
        }

        return (
          okToComment && (!moderationKeys || !email.includes(moderationKeys))
        );
      }
    }
    return true;
  }

  // wp_allow_comment
  async getStatus(
    comment: Partial<types.Tables["comments"]>
  ): Promise<z.infer<typeof val.database.wpComments.shape.comment_approved>> {
    const parsed = val.database.wpComments.safeParse({
      comment_ID: 0,
      ...comment,
    });

    if (!parsed.success) {
      return "0";
    }

    const data = parsed.data;
    /*
     * Simple duplicate check.
     * expected_slashed ($comment_post_ID, $comment_author, $comment_author_email, $comment_content)
     */
    const queryUtil = this.components.get(QueryUtil);
    const duplicate = await queryUtil.comments((query) => {
      query
        .where("post_ID", formatting.unslash(data.comment_post_ID))
        .where("parent", formatting.unslash(data.comment_parent));

      if (data.comment_author) {
        query.where("author", formatting.unslash(data.comment_author));
      }

      if (data.comment_author_email) {
        query.where(
          "author_email",
          formatting.unslash(data.comment_author_email)
        );
      }
      query.builder.first();
    }, val.database.wpComments);

    if (duplicate) {
      throw new Error("comment_duplicate");
    }

    let user: User | undefined = undefined;
    let post: types.Tables["posts"] | undefined = undefined;

    if (data.user_id && data.comment_post_ID) {
      const userUtil = this.components.get(UserUtil);
      user = await userUtil.get(data.user_id);
      post = await queryUtil.posts((query) => {
        query.where("ID", data.comment_post_ID).builder.first();
      }, val.database.wpPosts);
    }

    if (
      user &&
      user.props &&
      (data.user_id == post?.post_author ||
        (await user.can("moderate_comments")))
    ) {
      return "1";
    }

    let approved: Awaited<ReturnType<CommentUtil["getStatus"]>> = "0";
    if (await this.isValid(comment)) {
      approved = "1";
    }

    if (await this.containsNGWord(comment)) {
      approved = this.config.config.constants.EMPTY_TRASH_DAYS
        ? "trash"
        : "spam";
    }

    return approved;
  }
}
