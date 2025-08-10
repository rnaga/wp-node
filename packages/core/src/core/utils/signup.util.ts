import { z } from "zod";

import { formatting } from "../../common";
import { Config } from "../../config";
import { component } from "../../decorators/component";
import * as val from "../../validators";
import { Components } from "../components";
import { Current } from "../current";
import { User } from "../user";
import { QueryUtil } from "./query.util";
import { SiteUtil } from "./site.util";
import { Options } from "../options";

type RegistrationType = "all" | "none" | "blog" | "user";

@component()
export class SignupUtil {
  constructor(
    private components: Components,
    private config: Config,
    private siteUtil: SiteUtil
  ) {}

  // $active_signup
  /**
   *
   * @returns string returns registration type. The value can be
   *                              'all', 'none', 'blog', or 'user'.
   */
  async getRegistrationType(): Promise<RegistrationType> {
    if (!this.config.isMultiSite()) {
      return "none";
    }

    const options = this.components.get(Options);
    const current = this.components.get(Current);
    const activeSignup = await options.get<RegistrationType>("registration", {
      siteId: current.siteId,
    });

    return activeSignup &&
      ["all", "none", "blog", "user"].includes(activeSignup)
      ? activeSignup
      : "none";
  }

  // users_can_register_signup_filter
  async canUserSignup(): Promise<boolean> {
    const registrationType = await this.getRegistrationType();

    return registrationType === "all" || registrationType === "user";
  }

  async alreadySignedUp(
    args:
      | { userLoginOrEmail: string; domain?: never; path?: never }
      | {
          userLoginOrEmail?: never;
          domain: string;
          path: string;
        },

    options?: { days: number }
  ) {
    const { userLoginOrEmail, domain, path } = args;
    const { days = 2 } = options ?? {};
    const queryUtil = this.components.get(QueryUtil);

    if (!userLoginOrEmail && (!domain || !path)) {
      return false;
    }

    const signup = await queryUtil.common(
      "signups",
      (query) => {
        if (userLoginOrEmail) {
          query
            .where("user_email", userLoginOrEmail)
            .or.where("user_login", userLoginOrEmail);
        } else if (domain && path) {
          query.where("domain", domain).where("path", path);
        }
        query.builder.first();
      },
      val.database.wpSignups
    );

    if (!signup || !signup.registered) {
      return false;
    }

    const registered = (
      typeof signup.registered == "string"
        ? new Date(signup.registered)
        : signup.registered
    )?.getTime();

    // Throw error if email was recently registered
    if (new Date().getTime() - registered <= days * 24 * 60 * 60 * 1000) {
      return true;
    }

    return false;
  }

  // wpmu_validate_user_signup
  async validateUser(
    name: string,
    email: string
  ): Promise<[boolean, string | undefined]> {
    if (!this.config.isMultiSite()) {
      return [false, "Not multisite"];
    }
    const formattedName = formatting.username(name).replace(/\s+/g, "");

    if (0 >= name.length || name !== formattedName || /[^a-z0-9]/.test(name)) {
      return [
        false,
        "Usernames can only contain lowercase letters (a-z) and numbers",
      ];
    }

    const reservedNames = await this.siteUtil.getReservedNames();
    if (reservedNames.includes(name)) {
      return [false, "Username is not allowed (reserved)"];
    }

    const parsedEmail = z.email().min(4).max(60).safeParse(email);
    if (!parsedEmail.success || (await this.siteUtil.isEmailUnsafe(email))) {
      return [false, "Invalid email address (unsafe or format)"];
    }

    if (/^[0-9]*$/.test(name)) {
      return [false, "Invalid name (numbers only)"];
    }

    if (!(await this.siteUtil.isLimitedEmailDomains(email))) {
      return [false, "Invalid email address (limited email domains)"];
    }

    const parsedName = val.trx.userLogin.safeParse(name);
    if (!parsedName.success) {
      return [false, parsedName.error.message];
    }

    const queryUtil = this.components.get(QueryUtil);
    const users = await queryUtil.users((query) => {
      query.where("user_login", name).or.where("user_email", email);
    });

    if (users && users.length > 0) {
      return [false, "User already exists"];
    }

    if (
      (await this.alreadySignedUp({ userLoginOrEmail: name })) ||
      (await this.alreadySignedUp({ userLoginOrEmail: email }))
    ) {
      return [false, "User already signed up"];
    }

    return [true, undefined];
  }

  // wpmu_validate_blog_signup
  async validateBlog(
    name: string,
    title: string,
    user?: User
  ): Promise<[boolean, string | undefined]> {
    const current = this.components.get(Current);
    const currentSiteId = current.siteId;

    if (!current.site?.props.site.domain || !current.site?.props.site.path) {
      return [false, "Invalid current domain or path"];
    }

    const basePath = current.site.props.site.path;
    const domain = current.site.props.site.domain;

    title = formatting.stripTags(title);

    const reservedNames = await this.siteUtil.getReservedNames();

    if (/[^a-z0-9]+/.test(name)) {
      return [false, "Invalid blogname (numbers and lowercase letters)"];
    }

    if (reservedNames.includes(name) || name.length < 4) {
      return [false, "Invalid blogname (reserved or length)"];
    }

    const subdomainInstall = this.config.config.multisite.subdomainInstall;

    const queryUtil = this.components.get(QueryUtil);
    if (
      !subdomainInstall &&
      (await queryUtil.usingBlog(currentSiteId).posts((query) => {
        query
          .where("post_type", "page")
          .where("post_name", name)
          .builder.limit(1);
      }))
    ) {
      return [false, "Invalid blogname (site name)"];
    }

    queryUtil.resetBlog();

    if (/^[0-9]*$/.test(name)) {
      return [false, "Invalid name (numbers only)"];
    }

    title = formatting.unslash(title);
    if (0 >= title.length) {
      return [false, "Invalid title"];
    }

    const myDomain = subdomainInstall
      ? `${name}.${domain.replace(/^www\./, "")}`
      : domain;
    const path = subdomainInstall ? basePath : `${basePath}${name}/`;

    const sites = await queryUtil.sites((query) => {
      query.where("domain", myDomain).where("path", path);
    });

    if (sites) {
      return [false, "Site already exists"];
    }

    const existingUser = await queryUtil.users((query) => {
      query.where("user_login", name).builder.first();
    }, val.database.wpUsers);

    if (existingUser && (!user || user.props?.user_login !== name)) {
      return [false, "Invalid name (user_login)"];
    }

    if (await this.alreadySignedUp({ domain, path })) {
      return [false, "Already signed up"];
    }

    return [true, undefined];
  }
}
