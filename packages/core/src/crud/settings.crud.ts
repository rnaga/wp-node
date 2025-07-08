import { z } from "zod";

import { Config } from "../config";
import { Components } from "../core/components";
import { QueryUtil } from "../core/utils/query.util";
import { component } from "../decorators/component";
import { OptionsTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";
import { Vars } from "../core/vars";

type Settings = z.infer<typeof val.crud.settings>;

@component()
export class SettingsCrud extends Crud {
  constructor(components: Components, private config: Config) {
    super(components);
  }

  // These records are visible to public.
  // Use options.crud for private settings.
  readonly #mapping: Record<
    keyof Settings,
    (typeof this.config.config.options.defaults)[number]
  > = {
    title: "blogname",
    description: "blogdescription",
    url: "siteurl",
    home: "home",
    email: "admin_email",
    timezone: "timezone_string",
    date_format: "date_format",
    time_format: "time_format",
    start_of_week: "start_of_week",
    use_smilies: "use_smilies",
    default_category: "default_category",
    default_post_format: "default_post_format",
    posts_per_page: "posts_per_page",
    show_on_front: "show_on_front",
    page_on_front: "page_on_front",
    page_for_posts: "page_on_front",
    default_ping_status: "default_ping_status",
    default_comment_status: "default_comment_status",
    site_icon: "site_icon",
  };

  private optionNames() {
    return Object.entries(this.#mapping).map((v) => v[1]) as string[];
  }

  private get reversedMapping() {
    return Object.entries(this.#mapping)
      .map((v) => ({ [v[1]]: v[0] }))
      .reduce((obj, item) => ({ ...obj, ...item }), {});
  }

  private async checkPermission() {
    const { user } = await this.getUser();
    if (!(await user.can("manage_options"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }
  }

  async get(options?: { blogId: number }) {
    const { blogId } = options ?? {};
    const { user } = await this.getUser();
    const vars = this.components.get(Vars);
    try {
      if (blogId) {
        await this.switchBlog({ blogId });
      }

      const role = await user.role();
      if (role.is("anonymous")) {
        throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
      }

      const queryUtil = this.components.get(QueryUtil);
      const optionsCore =
        (await queryUtil.options((query) => {
          query.whereIn(this.optionNames());
        }, z.array(val.query.optionsResult))) ?? [];

      const data: Record<string, any> = optionsCore
        .map((option) => ({
          [this.reversedMapping[option.option_name]]: option.option_value,
        }))
        .reduce((obj, item) => ({ ...obj, ...item }), {});

      data.timezone = vars.TZ_IDENTIFIER;
      data.time_offset_minutes = vars.TIME_OFFSET_MINUTES;

      return this.returnValue(
        data as Settings & { time_offset_minutes: number }
      );
    } finally {
      await this.restoreBlog();
    }
  }

  async update(input: Settings, options?: { blogId: number }) {
    const { blogId } = options ?? {};
    try {
      if (blogId) {
        await this.switchBlog({ blogId });
      }

      await this.checkPermission();

      const data = val.crud.settings.parse(input);

      const optionsTrx = this.components.get(OptionsTrx);
      for (const [key, value] of Object.entries(data)) {
        await optionsTrx.insert(
          (this.#mapping as Record<string, string>)[key],
          value,
          {
            upsert: true,
          }
        );
      }

      return this.returnValue(true);
    } finally {
      await this.restoreBlog();
    }
  }
}
