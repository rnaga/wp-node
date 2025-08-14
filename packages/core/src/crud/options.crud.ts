import { z } from "zod";

import { formatting } from "../common";
import { Config } from "../config";
import { Components } from "../core/components";
import { User } from "../core/user";
import { Vars } from "../core/vars";
import { component } from "../decorators/component";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

// src/wp-admin/options.php
const allowedOptions = {
  general: [
    "blogname",
    "blogdescription",
    "gmt_offset",
    "date_format",
    "time_format",
    "start_of_week",
    "timezone_string",
    "admin_email",
  ] as const,
  discussion: [
    "default_pingback_flag",
    "default_ping_status",
    "default_comment_status",
    "comments_notify",
    "moderation_notify",
    "comment_moderation",
    "require_name_email",
    "comment_previously_approved",
    "comment_max_links",
    "moderation_keys",
    "disallowed_keys",
    "show_avatars",
    "avatar_rating",
    "avatar_default",
    "close_comments_for_old_posts",
    "close_comments_days_old",
    "thread_comments",
    "thread_comments_depth",
    "page_comments",
    "comments_per_page",
    "default_comments_page",
    "comment_order",
    "comment_registration",
    "show_comments_cookies_opt_in",
  ] as const,
  media: [
    "thumbnail_size_w",
    "thumbnail_size_h",
    "thumbnail_crop",
    "medium_size_w",
    "medium_size_h",
    "large_size_w",
    "large_size_h",
    "image_default_size",
    "image_default_align",
    "image_default_link_type",
  ] as const,
  reading: [
    "posts_per_page",
    "posts_per_rss",
    "rss_use_excerpt",
    "show_on_front",
    "page_on_front",
    "page_for_posts",
    "blog_public",
  ] as const,
  writing: [
    "default_category",
    "default_email_category",
    "default_link_category",
    "default_post_format",
  ] as const,
};

// Adding user_registration and default_role to the general options
// to allow them to be managed in the same way as other options.
// This is only for single site, as multisite has its own user self-registration.
type AllowedOptions = {
  general: readonly (
    | (typeof allowedOptions.general)[number]
    | "users_can_register"
    | "default_role"
  )[];
  discussion: readonly (typeof allowedOptions.discussion)[number][];
  media: readonly (typeof allowedOptions.media)[number][];
  reading: readonly (typeof allowedOptions.reading)[number][];
  writing: readonly (typeof allowedOptions.writing)[number][];
};

type AllowedOptionKeys = AllowedOptions[keyof AllowedOptions][number][];

@component()
export class OptionsCrud extends Crud {
  constructor(components: Components, private config: Config) {
    super(components);
  }

  private async checkPermission(user?: User) {
    const { user: currentUser } = await this.getUser();
    user = user ?? currentUser;

    if (
      !(await user.can("manage_options")) ||
      (this.config.isMultiSite() && !(await user.can("manage_network_options")))
    ) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }
  }

  async getAll(options?: Parameters<OptionsCrud["get"]>[1]) {
    return this.get(undefined, options);
  }

  async get<
    T extends keyof AllowedOptions,
    K extends T extends keyof AllowedOptions
      ? AllowedOptions[T]
      : AllowedOptionKeys
  >(key?: T, options?: Partial<{ blogId: number }>) {
    await this.checkPermission();
    const { blogId } = options ?? {};

    const vars = this.components.get(Vars);
    const context = await vars.CONTEXT.clone();
    if (blogId && this.config.isMultiSite()) {
      await context.current.switchBlog(blogId);
    }

    const redefinedAllowedOptions = this.config.isMultiSite()
      ? allowedOptions
      : // For single site, we add user_registration and default_role to the general options
        {
          ...allowedOptions,
          general: [
            ...allowedOptions.general,
            "users_can_register",
            "default_role",
          ],
        };

    const optionNames = key
      ? redefinedAllowedOptions[key]
      : Object.values(redefinedAllowedOptions).flat();

    const data = (
      (await context.utils.query.options((query) => {
        query.whereIn(optionNames as string[]);
      }, z.array(val.query.optionsResult))) ?? []
    )
      .map((option) => ({
        [option.option_name]: formatting.primitive(option.option_value),
      }))
      .reduce((obj, item) => ({ ...obj, ...item }), {});

    return this.returnValue(data as Record<K[number], any>);
  }

  async update(
    input: Partial<z.infer<typeof val.options>>,
    options?: Partial<{ blogId: number }>
  ) {
    await this.checkPermission();
    const { blogId } = options ?? {};
    const data = val.options.partial().parse(input);

    const vars = this.components.get(Vars);
    const context = await vars.CONTEXT.clone();
    if (blogId && this.config.isMultiSite()) {
      await context.current.switchBlog(blogId);
    }

    for (const [key, val] of Object.entries(data)) {
      await context.utils.trx.options.update(key, val);
    }

    return this.returnValue(true);
  }
}
