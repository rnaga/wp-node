import { Config } from "../config";
import { component } from "../decorators/component";
import * as defaults from "../defaults";
import * as val from "../validators";
import { Components } from "./components";
import { Logger } from "./logger";
import { Options } from "./options";
import { Post } from "./post";
import { Role } from "./role";
import { Site } from "./site";
import { Tables } from "./tables";
import { User } from "./user";
import { QueryUtil } from "./utils/query.util";
import { RolesUtil } from "./utils/roles.util";
import { Vars } from "./vars";
import moment from "moment-timezone";

@component()
export class Current {
  #props: Partial<{
    post: Post;
    role: Role;
    user: User;
    multi: {
      site: Site;
    };
  }> & { tables: Tables };

  #previous: Array<{ blogId: number; siteId: number; userId: number }> = [];

  constructor(
    private config: Config,
    private logger: Logger,
    private components: Components,
    private vars: Vars
  ) {
    this.#props = {
      tables: this.components.get(Tables),
    };
  }

  get blogId() {
    if (this.config.isMultiSite()) {
      return this.#props.multi?.site.props.blog.blog_id ?? 0;
    }
    return 0;
  }

  get siteId() {
    if (this.config.isMultiSite()) {
      return this.#props.multi?.site.props.site.id ?? 0;
    }
    return 0;
  }

  get post() {
    return this.#props.post;
  }

  get user() {
    return this.#props.user;
  }

  get site() {
    return this.#props.multi?.site;
  }

  get role() {
    return this.#props.role;
  }

  get tables() {
    return this.#props.tables;
  }

  async setPost(id: number) {
    this.#props.post = await this.components.asyncGet(Post, [id]);
  }

  async assumeUser(userRefOrUser?: number | string | User) {
    if (
      !userRefOrUser ||
      typeof userRefOrUser == "string" ||
      typeof userRefOrUser == "number"
    ) {
      this.#props.user = await this.components.asyncGet(User, [userRefOrUser]);
      this.#props.role = await this.#props.user.role();
    } else {
      this.#props.user = userRefOrUser;
      this.#props.role = await userRefOrUser.role();
    }
  }

  async setTimezone() {
    let offsetMinutes = 0;

    const options = this.components.get(Options);
    const timezoneString = await options.get("timezone_string");
    if (timezoneString && timezoneString?.length > 0) {
      this.vars.TZ_IDENTIFIER = timezoneString;
      try {
        // utcOffset - Setting the UTC offset by supplying minutes
        offsetMinutes = moment.tz(this.vars.TZ_IDENTIFIER).utcOffset();
      } catch (e) {
        this.logger.warn(`${e}`, { error: e });
      }
    }

    const gmtOffset = await options.get("gmt_offset");
    if (gmtOffset && parseInt(gmtOffset) !== 0) {
      offsetMinutes = parseInt(gmtOffset) * 60;
    }

    this.vars.TIME_OFFSET_MINUTES = offsetMinutes;
    const offsetHours = Math.floor(offsetMinutes / 60);

    if (!timezoneString) {
      this.vars.TZ_IDENTIFIER = `Etc/GMT${
        offsetHours == 0
          ? ""
          : offsetHours > 0
          ? "+" + offsetHours
          : offsetHours
      }`;
    }
  }

  setDefaultUserRoles() {
    this.vars.USER_ROLES = defaults.roles;
  }

  async setUserRoles() {
    const rolesUtil = this.components.get(RolesUtil);
    const roles = await rolesUtil.get(this.blogId);

    // Save user roles to global vars
    this.vars.USER_ROLES = roles;
  }

  async restorePrevious() {
    const previous = this.#previous.pop();
    if (!previous) return;

    await this.switchSite(previous.siteId, previous.blogId);
    if (previous.userId > 0) {
      await this.assumeUser(previous.userId);
    }
  }

  async switchBlog(blogRef: number | string) {
    const previous = {
      blogId: this.blogId,
      siteId:
        this.site?.props.site.id ?? this.config.config.multisite.defaultSiteId,
      userId: this.user?.props?.ID ?? 0,
    };

    await this.#props.multi?.site.setBlog(blogRef);

    if (this.blogId) {
      // Update index at conext scope
      this.vars.TABLES_MS_CURRENT_INDEX = this.blogId;
      this.#props.tables.index = this.blogId;
    }

    await this.setUserRoles();

    this.#previous.push(previous);
  }

  async switchSite(siteRef: number | string, blogRef?: number | string) {
    if (!this.config.config.multisite.enabled) {
      this.logger.info(`Multi site is not enabled`);
      return;
    }

    const previous = {
      blogId: this.blogId,
      siteId:
        this.site?.props.site.id ?? this.config.config.multisite.defaultSiteId,
      userId: this.user?.props?.ID ?? 0,
    };

    if (!blogRef) {
      // Set default blog id
      const queryUtil = this.components.get(QueryUtil);
      const siteMeta = await queryUtil.sites((query) => {
        query.withMeta().where("meta_key", "main_site").get(siteRef);
      }, val.database.wpSiteMeta);

      if (!siteMeta || siteMeta.meta_value == null) {
        blogRef = 1;
      } else {
        blogRef = parseInt(siteMeta.meta_value);
      }
    }

    const site = await this.components.asyncGet(Site, [siteRef, blogRef]);
    if (!site) {
      throw new Error(`Site not found: ${siteRef} ${blogRef}`);
    }

    // Reset user and role
    this.#props.role = undefined;
    this.#props.user = undefined;

    // Reset post
    this.#props.post = undefined;

    this.#props.multi = { site };

    // Switch blog
    await this.switchBlog(site.props.blog.blog_id);

    this.#previous.push(previous);

    return this;
  }
}
