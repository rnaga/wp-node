import { z } from "zod";

import { formatting } from "../common";
import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Logger } from "../core/logger";
import { Options } from "../core/options";
import { DateTimeUtil } from "../core/utils/date-time.util";
import { QueryUtil } from "../core/utils/query.util";
import { RolesUtil } from "../core/utils/roles.util";
import { UserUtil } from "../core/utils/user.util";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as defaults from "../defaults";
import * as val from "../validators";
import { CommentTrx } from "./comment.trx";
import { MetaTrx } from "./meta.trx";
import { OptionsTrx } from "./options.trx";
import { PostTrx } from "./post.trx";
import { SiteTrx } from "./site.trx";
import { TermTrx } from "./term.trx";
import { Trx } from "./trx";

@transactions()
export class SeederTrx extends Trx {
  constructor(
    private components: Components,
    private logger: Logger,
    private database: Database,
    private config: Config,
    private optionsTrx: OptionsTrx,
    private metaTrx: MetaTrx,
    private queryUtil: QueryUtil,
    private siteTrx: SiteTrx,
    private postTrx: PostTrx,
    private termTrx: TermTrx
  ) {
    super(components);
  }

  private async currentDbVersion() {
    const optionsComponent = this.components.get(Options);
    return await optionsComponent.get("db_version");
  }

  // populate_options
  async populateOptions(options: Record<string, any>) {
    const siteUrl = options.siteUrl;

    if (!siteUrl) {
      throw new Error("siteurl not found");
    }

    let seeds: Record<string, any> = defaults.options(this.config, {
      siteUrl,
    });

    const currentDbVersion = parseInt((await this.currentDbVersion()) ?? "0");
    const optionsComponent = this.components.get(Options);
    const dbVersion = this.config.config.constants.WP_DB_VERSION;

    // 3.3.0
    if (!this.config.isMultiSite()) {
      seeds["initial_db_version"] =
        currentDbVersion > 0 && currentDbVersion < dbVersion
          ? currentDbVersion
          : dbVersion;
    }

    // 3.0.0 multisite.
    if (this.config.isMultiSite()) {
      seeds["permalink_structure"] = "/%year%/%monthnum%/%day%/%postname%/";
    }

    if (options) {
      seeds = { ...seeds, ...options };
    }

    // Set autoload to no for these options.
    const fatOptions = [
      "moderation_keys",
      "recently_edited",
      "disallowed_keys",
      "uninstall_plugins",
      "auto_plugin_theme_update_emails",
    ];

    for (const [key, value] of Object.entries(seeds)) {
      await this.optionsTrx.insert(key, value, {
        seriazlie: Array.isArray(value),
        upsert: false,
        autoload: fatOptions.includes(key) ? "no" : "yes",
        force: true,
      });
    }

    const home = await optionsComponent.get("home");
    if (!home) {
      await this.optionsTrx.insert("home", siteUrl);
    }
  }

  // populate_roles
  async populateRoles() {
    const roleUtils = this.components.get(RolesUtil);

    const seed = roleUtils.reformatInDB({
      administrator: defaults.roles.administrator,
      editor: defaults.roles.editor,
      author: defaults.roles.author,
      contributor: defaults.roles.contributor,
      subscriber: defaults.roles.subscriber,
    });

    const key = `${this.tables.prefix}user_roles`;

    return await this.optionsTrx.insert(key, seed, {
      seriazlie: true,
      autoload: "yes",
      force: true,
    });
  }

  private async validMultisite() {
    if (!this.config.isMultiSite()) {
      return false;
    }

    const site = await this.queryUtil.sites((query) => {
      query.where("id", 1);
    });

    if (!site) {
      return false;
    }

    const blog = await this.queryUtil.blogs((query) => {
      query.where("blog_id", 1);
    });

    return blog ? true : false;
  }

  // populate_network_meta
  async populateSitemeta(
    siteId: number,
    meta: { admin_email: string; subdomain_install: boolean } & Record<
      string,
      any
    > = { admin_email: "", subdomain_install: true }
  ) {
    const userUtil = this.components.get(UserUtil);
    const current = this.components.get(Current);
    const optionsComponent = this.components.get(Options);

    const subdomainInstall = meta["subdomain_install"];

    const validMultisite = await this.validMultisite();

    let email = meta["admin_email"];

    // If a user with the provided email does not exist, default to the current user as the new network admin.
    let siteUser = current.user;
    if (0 < email.length) {
      const user = await this.queryUtil.users((query) => {
        query.where("user_email", email as string).builder.first();
      }, val.database.wpUsers);

      if (user) siteUser = await userUtil.get(user.ID);
    }

    if (!siteUser?.props) {
      this.logger.warn("User not found", { siteUser });
      return;
    }

    const siteUserLogin = siteUser.props.user_login;
    const siteUserId = siteUser.props.ID;

    if (0 >= email.length) {
      if (siteUser.props.user_email && 0 < siteUser.props.user_email.length) {
        email = siteUser.props.user_email;
      } else {
        throw new Error(`Admin email is not specified`);
      }
    }

    const template = await optionsComponent.get("template");
    const stylesheet = await optionsComponent.get("stylesheet");

    let allowedThemes = stylesheet ?? "";
    if (template && template !== stylesheet) {
      allowedThemes = template;
    }

    const defaultTheme = this.config.config.constants.WP_DEFAULT_THEME;
    if (defaultTheme !== stylesheet && defaultTheme !== template) {
      allowedThemes = defaultTheme;
    }

    const siteAdmins = new Set();
    if (!validMultisite) {
      siteAdmins.add(siteUserLogin);
      (
        (await this.queryUtil.users((query) => {
          query.withRoles(["administrator"]);
        })) ?? []
      ).forEach((user) => {
        siteAdmins.add(user.user_login);
      });
    } else {
      const result = await optionsComponent.get<string[]>("site_admins", {
        siteId,
      });

      if (Array.isArray(result)) {
        result.forEach((email) => siteAdmins.add(email));
      }
    }

    const uploadFiletypes = [
      ...this.config.config.extensions.misc,
      ...this.config.config.extensions.audio,
      ...this.config.config.extensions.video,
    ];

    const siteUrl = (await optionsComponent.get("siteurl")) ?? "";

    let sitemeta = {
      site_name: "My Network",
      admin_email: email, // Make sure to define 'email' before using it
      admin_user_id: siteUserId, // Make sure to define 'site_user' before using it
      registration: "none",
      upload_filetypes: uploadFiletypes.join(" "), // Make sure to define 'upload_filetypes' before using it
      blog_upload_space: 100,
      fileupload_maxk: 1500,
      site_admins: Array.from(siteAdmins), // Make sure to define 'site_admins' before using it
      allowedthemes: { [allowedThemes]: true }, // Make sure to define 'allowed_themes' before using it
      illegal_names: [
        "www",
        "web",
        "root",
        "admin",
        "main",
        "invite",
        "administrator",
        "files",
      ],
      wpmu_upgrade_site: this.config.config.constants.WP_DB_VERSION, // Make sure to define 'wp_db_version' before using it
      welcome_email: defaults.seeder.sitemeta.emailSiteWelcome, // Make sure to define 'welcome_email' before using it
      first_post: `Welcome to %s. This is your first post. Edit or delete it, then start writing!`, // Make sure to define 'site_link' before using it
      // @todo - Network admins should have a method of editing the network siteurl (used for cookie hash).
      siteurl: `${siteUrl}/`,
      add_new_users: "0",
      upload_space_check_disabled: validMultisite
        ? await optionsComponent.get("upload_space_check_disabled", { siteId })
        : "1",
      subdomain_install: subdomainInstall, // Make sure to define 'subdomain_install' before using it
      ms_files_rewriting: validMultisite
        ? await optionsComponent.get("ms_files_rewriting", { siteId })
        : "0",
      user_count: await optionsComponent.get("user_count", { siteId }),
      initial_db_version: await optionsComponent.get("initial_db_version"),
      active_sitewide_plugins: [],
      WPLANG: this.config.config.constants.WPLANG,
    };

    if (!subdomainInstall) {
      sitemeta["illegal_names"].push("blog");
    }

    sitemeta = { ...sitemeta, ...meta };

    await this.metaTrx.bulkUpsertObject("site", siteId, sitemeta);
  }

  // populate_network
  async populateSite(
    input: Partial<{
      siteId?: number;
      domain: string;
      email: string;
      siteName: string;
      path: string;
    }>,
    options?: {
      subdomainInstall?: boolean;
    }
  ) {
    let { siteId = undefined } = input;
    const { domain = "", email = "", siteName = "", path = "/" } = input;

    const { subdomainInstall } = options ?? {};

    const errors: string[] = [];

    if (0 >= domain.length) {
      errors.push("You must provide a domain name.");
    }

    if (0 >= siteName.length) {
      errors.push("You must provide a name for your network of sites.");
    }

    // Check for network collision.
    if (
      siteId &&
      (await this.queryUtil.sites((query) => {
        query.where("id", siteId as number);
      }))
    ) {
      errors.push(`The network already exists. - ${siteId}`);
    }

    if (!z.email().safeParse(email).success) {
      errors.push(`You must provide a valid email address. - ${email}`);
    }

    if (0 < errors.length) {
      throw new Error(errors.join("\n"));
    }

    siteId = await this.siteTrx.insert({
      domain,
      path,
      id: siteId,
    });

    if (!siteId) {
      throw new Error(`Failed to insert site - ${domain}`);
    }

    await this.populateSitemeta(siteId, {
      admin_email: email,
      site_name: siteName,
      subdomain_install: subdomainInstall ?? false,
    });

    /*
     * When upgrading from single to multisite, assume the current site will
     * become the main site of the network. When using populate_network()
     * to create another network in an existing multisite environment, skip
     * these steps since the main site of the new network has not yet been
     * created.
     */
    if (await this.validMultisite()) {
      return true;
    }

    // Create a primary blog (blogId = 1)
    const trx = await this.database.transaction;
    //let blogId = 0;
    try {
      await trx
        .insert({
          site_id: siteId,
          blog_id: 1,
          domain,
          path,
          registered: formatting.dateMySQL(),
        })
        .into(this.tables.get("blogs"));
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to create blog - ${e}`);
    }
    await trx.commit();

    const result = await this.queryUtil.meta("site", (query) => {
      query.withKeys(["admin_user_id"]).withIds([siteId as number], {
        joinPrimary: false,
      });
    });

    if (!result) {
      throw new Error(`site user not found - ${siteId}`);
    }

    const siteUserId = formatting.primitive(result[0].meta_value) as number;
    const current = this.components.get(Current);

    await this.metaTrx.upsert("user", siteUserId, "source_domain", domain);
    await this.metaTrx.upsert(
      "user",
      siteUserId,
      "primary_blog",
      current.site?.props.blog.blog_id
    );

    return subdomainInstall;
  }

  // wp_install_defaults
  async populateContent(userId: number) {
    const optionsComponent = this.components.get(Options);
    const categoryName = "Uncategorized";
    const categorySlug = formatting.slug("Uncategorized");

    let categoryTerm: { term_id: number; term_taxonomy_id: number };

    try {
      categoryTerm = await this.termTrx.insert(categoryName, "category", {
        slug: categorySlug,
      });
    } catch (e) {
      this.logger.info(`${e}`, {
        "termTrx.tables.index": this.termTrx.tables.index,
      });
      const categoryTerms = await this.queryUtil.terms((query) => {
        query.where("taxonomy", "category").where("terms.name", categoryName);
      });

      // This never happens
      if (!categoryTerms) {
        throw new Error(`categoryTerm not found - ${categoryName}`);
      }

      categoryTerm = categoryTerms[0];
    }

    const homeUrl = await optionsComponent.get("home");
    const validMultisite = await this.validMultisite();

    const dateTimeUtil = this.components.get(DateTimeUtil);
    const dateTime = dateTimeUtil.get();

    const postId = await this.postTrx.upsert({
      post_author: userId,
      post_content: defaults.seeder.content.firstPost,
      post_title: `Hello world!`,
      post_name: formatting.slug("hello-world"),
      post_date: dateTime.mySQLDatetime,
      post_date_gmt: dateTime.mySQLGMTDatetime,
      guid: `${homeUrl}/?p=1`,
      comment_count: 1,
      post_status: "publish",
    });

    if (validMultisite) {
      await this.postTrx.updateCount();
    }

    await this.termTrx.syncObject(
      postId,
      [categoryTerm.term_taxonomy_id],
      "category"
    );

    // Default comment.
    const commentTrx = this.components.get(CommentTrx);

    await commentTrx.upsert({
      comment_post_ID: postId,
      comment_author: "A WordPress Commenter",
      comment_author_email: "wapuu@wordpress.example",
      comment_author_url: "https://wordpress.org/",
      comment_date: dateTime.mySQLDatetime,
      comment_date_gmt: dateTime.mySQLGMTDatetime,
      comment_content: defaults.seeder.content.commentContent,
      comment_type: "comment",
    });

    // First page.
    await this.postTrx.upsert({
      post_author: userId,
      post_content: defaults.seeder.content.firstPage,
      comment_status: "closed",
      post_title: "Sample Page",
      post_name: "sample-page",
      post_date: dateTime.mySQLDatetime,
      post_date_gmt: dateTime.mySQLGMTDatetime,
      guid: `${homeUrl}/?page_id=2`,
      post_type: "page",
      post_status: "publish",
      meta_input: {
        _wp_page_template: "default",
      },
    });

    let privacyPolicyContent: string | undefined = undefined;

    if (validMultisite) {
      const current = this.components.get(Current);
      const siteId = current.site?.props.site.id ?? 1;
      privacyPolicyContent = await optionsComponent.get(
        "default_privacy_policy_content",
        {
          siteId,
        }
      );
    } else {
      privacyPolicyContent = defaults.seeder.content.privacyPage;
    }

    if (privacyPolicyContent) {
      const privacyPageId = await this.postTrx.upsert({
        post_author: userId,
        post_content: privacyPolicyContent,
        comment_status: "closed",
        post_title: "Privacy Policy",
        post_name: "privacy-policy",
        guid: `${homeUrl}/?page_id=3`,
        meta_input: {
          _wp_page_template: "default",
        },
      });

      await this.optionsTrx.insert("wp_page_for_privacy_policy", privacyPageId);
    }

    // Set up default widgets for default theme.
    await this.optionsTrx.insert(
      "widget_block",
      defaults.seeder.content.widgetData,
      {
        seriazlie: true,
      }
    );

    await this.optionsTrx.insert(
      "sidebars_widgets",
      defaults.seeder.content.sidebarsWidgets,
      {
        seriazlie: true,
      }
    );

    const userUtil = this.components.get(UserUtil);
    const user = await userUtil.get(userId);
    const role = await user.role();

    if (!validMultisite) {
      await this.metaTrx.upsert("user", userId, "show_welcome_panel", 1);
    } else if (
      !role.isSuperAdmin() &&
      (await this.queryUtil.meta("user", (query) => {
        query
          .withIds([userId], { joinPrimary: false })
          .withKeys(["show_welcome_panel"]);
      }))
    ) {
      await this.metaTrx.upsert("user", userId, "show_welcome_panel", 2);
    }

    if (validMultisite) {
      if (!user.props) {
        throw new Error(`User not found - ${userId}`);
      }
      const userEmail = user.props.user_email;
      await this.optionsTrx.insert("admin_email", userEmail);

      const metaToDelete = await this.queryUtil.meta("user", (query) => {
        query.builder.not
          .__ref(query)
          .withIds([userId])
          .withKeys([`${this.tables.prefix}capabilities`]);
      });

      if (metaToDelete) {
        for (const meta of metaToDelete) {
          await this.metaTrx.remove("user", {
            objectId: meta.user_id,
            key: `${this.tables.prefix}capabilities`,
          });
        }
      }

      /*
       * Delete any caps that snuck into the previously active blog. (Hardcoded to blog 1 for now.)
       * TODO: Get previous_blog_id.
       */
      if (!role.isSuperAdmin() && 1 != user.props.ID) {
        await this.metaTrx.remove("user", {
          objectId: user.props.ID,
          key: `${this.config.config.tablePrefix}1_capabilities`,
        });
      }
    }
  }
}
