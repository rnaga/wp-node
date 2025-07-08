import { formatting, generatePassword } from "../common";
import { Config } from "../config";
import { Scope } from "../constants";
import Database from "../database";
import { component } from "../decorators/component";
import { BlogTrx, MetaTrx, SeederTrx, SiteTrx } from "../transactions";
import * as val from "../validators";
import { Components } from "./components";
import { Current } from "./current";
import { Options } from "./options";
import { Schema } from "./schema";
import { Tables } from "./tables";
import { LinkUtil } from "./utils/link.util";
import { QueryUtil } from "./utils/query.util";
import { TrxUtil } from "./utils/trx.util";
import { UserUtil } from "./utils/user.util";

@component({ scope: Scope.Transient })
export class Installer {
  constructor(
    private components: Components,
    private database: Database,
    private config: Config,
    private trxUtil: TrxUtil,
    private schema: Schema,
    private queryUtil: QueryUtil,
    private linkUtil: LinkUtil
  ) {}

  // wp_is_site_initialized
  async isBlogInitialized(blogId: number) {
    const tables = this.components.get(Tables);
    tables.index = blogId;

    return await this.database.hasTable(tables.get("posts"));
  }

  // helper for seederTrx.populateSite
  async initializeSite(...args: Parameters<SeederTrx["populateSite"]>) {
    const seeder = this.components.get(SeederTrx);
    const options = this.components.get(Options);

    await seeder.populateSite(...args);
    const queryUtil = this.components.get(QueryUtil);

    const site = await queryUtil.sites((query) => {
      const { column } = query.alias;
      query.builder.orderBy(column("site", "id"), "desc").first();
      if (args[0].domain) {
        query.where("domain", args[0].domain);
      }
      if (args[0].path) {
        query.where("path", args[0].path);
      }
    }, val.database.wpSite);

    if (!site) {
      throw new Error(`Site not found`);
    }

    // Update sitemeta for non-main site
    if (site.id > 1) {
      const siteAdmins = [];
      if (args[0].email) {
        const email = args[0].email;
        const users = await this.queryUtil.users((query) => {
          query.where("user_email", email);
        });

        if (users) {
          siteAdmins.push(users[0].user_login);
        }
      }

      let siteUrlScheme = "http";
      const defaultSiteUrl = await options.get("siteurl", {
        siteId: 1,
      });

      if (defaultSiteUrl && defaultSiteUrl.startsWith("https")) {
        siteUrlScheme = "https";
      }

      const siteUrl = formatting.untrailingslashit(
        `${siteUrlScheme}://${args[0].domain}${args[0].path}`
      );

      const metaTrx = this.components.get(MetaTrx);
      await metaTrx.bulkUpsertObject("site", site.id, {
        site_admins: siteAdmins,
        siteurl: siteUrl,
      });
    }

    return site.id;
  }

  async uninitializeSite(
    siteId: number,
    newSiteId?: number,
    options?: Partial<{
      newBlogStatus: Partial<{
        public: 0 | 1;
        archived: 0 | 1;
        deleted: 0 | 1;
      }>;
    }>
  ) {
    const newBlogStatus = {
      public: options?.newBlogStatus?.public ?? 0,
      archived: options?.newBlogStatus?.archived ?? 1,
      deleted: options?.newBlogStatus?.deleted ?? 1,
    };

    const queryUtil = this.components.get(QueryUtil);

    const site = await queryUtil.sites((query) => {
      query.where("id", siteId).builder.first();
    }, val.database.wpSite);

    if (!site) {
      throw new Error("Site not found");
    }

    if (1 === site.id) {
      throw new Error("Main site can't be uninitialized");
    }

    const blogs =
      (await queryUtil.blogs((query) => {
        query.where("site_id", siteId);
      })) ?? [];

    const blogTrx = this.components.get(BlogTrx);
    for (const blog of blogs) {
      if (newSiteId) {
        await blogTrx.changeSite(blog.blog_id, newSiteId);
        await blogTrx.upsert({
          blog_id: blog.blog_id,
          ...newBlogStatus,
        });
        continue;
      }

      await blogTrx.remove(blog.blog_id);
    }

    const siteTrx = this.components.get(SiteTrx);
    await siteTrx.remove(siteId);
    return true;
  }

  // wp_initialize_site
  //
  // Note: Don't directly call this method to create a new blog
  // Use blogTrx.upsert instead
  async initializeBlog(
    blogId: number,
    args: {
      userId: number;
      title?: string;
      options?: Record<string, any>;
      meta?: Record<string, any>;
    }
  ) {
    const optionsComponent = this.components.get(Options);

    if (typeof blogId !== "number") {
      throw new Error("Site ID must not be empty.");
    }

    const blog = await this.queryUtil.blogs((query) => {
      query.where("blog_id", blogId).builder.first();
    }, val.database.wpBlogs);

    if (!blog) {
      throw new Error(`Site with the ID does not exist. - ${blogId}`);
    }

    if (await this.isBlogInitialized(blogId)) {
      throw new Error(
        `The site appears to be already initialized. - ${blogId}`
      );
    }

    const site = await this.queryUtil.sites((query) => {
      query.where("id", blog.site_id).builder.first();
    }, val.database.wpSite);

    const current = this.components.get(Current);

    let siteId: number;

    if (site) {
      siteId = site.id;
    } else {
      if (!current.site?.props.site.id) {
        throw new Error(`Site not found - ${blog.site_id}`);
      }
      siteId = current.site.props.site.id;
    }

    const currentBlogId = current.blogId;

    if (currentBlogId !== blogId) {
      await current.switchSite(siteId, blogId);
    }

    const {
      userId = 0,
      title = `Site ${site?.id}`,
      options = {},
      meta = undefined,
    } = args ?? {};

    // Set up the database tables.
    await this.schema.build("blog");

    let homeScheme = "http";
    let siteUrlScheme = "http";

    if (!this.config.isSubdomainInstall()) {
      const homeUrl = await this.linkUtil.getHomeUrl({
        blogId,
      });

      //if ("https" === new URL(homeUrl).protocol.replace(/:$/, "")) {
      if (homeUrl.startsWith("https")) {
        homeScheme = "https";
      }

      const siteUrl = await optionsComponent.get("siteurl", {
        siteId,
      });

      //if (siteUrl && "https" === new URL(siteUrl).protocol.replace(/:$/, "")) {
      if (siteUrl && siteUrl.startsWith("https")) {
        siteUrlScheme = "https";
      }
    }

    let uploadPath = await optionsComponent.get("upload_path", {
      blogId,
    });

    const msFilesRewriting = await optionsComponent.get<boolean>(
      "ms_files_rewriting",
      {
        siteId,
      }
    );

    if (msFilesRewriting) {
      uploadPath = `${this.config.config.multisite.uploadBlogsDir}/${siteId}/files`;
    }

    // Populate the site's options.
    await this.trxUtil.seeder.populateOptions({
      home: formatting.untrailingslashit(
        `${homeScheme}://${blog.domain}${blog.path}`
      ),
      siteUrl: formatting.untrailingslashit(
        `${siteUrlScheme}://${blog.domain}${blog.path}`
      ),
      blogname: formatting.unslash(title),
      admin_email: "",
      upload_path: uploadPath,
      blog_public: blog.public,
      WPLANG: await optionsComponent.get("WPLANG", { siteId }),
      ...options,
    });

    // Populate the site's roles.
    await this.trxUtil.seeder.populateRoles();

    // Populate metadata for the site.
    if (meta) {
      await this.trxUtil.meta.bulkUpsertObject("site", siteId, meta);
    }

    const tables = this.components.get(Tables);
    tables.index = blogId;

    // Remove all permissions that may exist for the site.
    await this.trxUtil.meta.remove("user", {
      key: `${tables.prefix}user_level`,
      deleteAll: true,
    });

    await this.trxUtil.meta.remove("user", {
      key: `${tables.prefix}capabilities`,
      deleteAll: true,
    });

    await this.trxUtil.seeder.populateContent(userId);

    // Set the site administrator.
    await this.trxUtil.blog.addUser(blogId, userId, "administrator");

    const userUtil = this.components.get(UserUtil);
    const user = await userUtil.get(userId);
    const role = await user.role();
    const primaryBlog = await this.queryUtil.meta("user", (query) => {
      query.withIds([userId]).withKeys(["primary_blog"]);
    });

    if (!role.isSuperAdmin() && !primaryBlog) {
      await this.trxUtil.meta.upsert("user", userId, "primary_blog", blogId);
    }

    if (currentBlogId !== blogId) {
      await current.restorePrevious();
    }

    return true;
  }

  // wp_uninitialize_site
  //
  // Note: Don't directly call this method to delete a blog
  // Use blogTrx.remove instead
  async uninitializeBlog(blogId: number) {
    if (typeof blogId !== "number") {
      throw new Error("Site ID must not be empty.");
    }

    const blog = await this.queryUtil.blogs((query) => {
      query.where("blog_id", blogId).builder.first();
    }, val.database.wpBlogs);

    if (!blog) {
      throw new Error(`Site with the ID does not exist. - ${blogId}`);
    }

    if (!(await this.isBlogInitialized(blogId))) {
      throw new Error(
        `The site appears to be already uninitialized. - ${blogId}`
      );
    }

    const users = await this.queryUtil.users((query) => {
      query.withBlogIds([blogId]);
    });

    if (users) {
      for (const user of users) {
        await this.trxUtil.blog.removeUser(blogId, user.ID);
      }
    }

    const current = this.components.get(Current);
    const currentBlogId = current.blogId;

    if (currentBlogId != blogId) {
      await current.switchSite(blog.site_id, blogId);
    }

    await this.schema.dropBlog(blogId);

    // Delete directories

    if (currentBlogId != blogId) {
      await current.restorePrevious();
    }

    return true;
  }

  // wp_install
  /**
   *
   * Note: Requires siteUrl besides what's originally required for wp_install
   *
   * @param args - The arguments for the installation
   * @returns
   */
  async install(args: {
    siteUrl: string;
    blogTitle: string;
    userName: string;
    userEmail: string;
    isPublic: boolean;
    deprecated?: string;
    userPassword?: string;
    language?: string;
  }) {
    let { userPassword = undefined } = args;
    const {
      siteUrl,
      blogTitle,
      userName,
      userEmail,
      isPublic,
      language = undefined,
    } = args;

    // check_database_version - wp_check_mysql_version();
    await this.schema.build("all");
    await this.trxUtil.seeder.populateOptions({
      siteUrl,
    });
    await this.trxUtil.seeder.populateRoles();

    await this.trxUtil.options.update("blogname", blogTitle);
    await this.trxUtil.options.update("admin_email", userEmail);
    await this.trxUtil.options.update("blog_public", isPublic ? "1" : "0");

    // Freshness of site - in the future, this could get more specific about actions taken, perhaps.
    await this.trxUtil.options.update("fresh_site", "1");

    if (language) {
      await this.trxUtil.options.update("WPLANG", language);
    }

    await this.trxUtil.options.update("siteurl", siteUrl);

    if (!isPublic) {
      await this.trxUtil.options.update("default_pingback_flag", 0);
    }

    /*
     * Create default user. If the user already exists, the user tables are
     * being shared among sites. Just set the role in that case.
     */
    let userId = (
      (await this.queryUtil.users((query) => {
        query.where("user_login", userName).builder.first();
      }, val.database.wpUsers)) ?? {}
    )?.ID;

    if (!userId) {
      let userUpsert: Parameters<typeof this.trxUtil.user.upsert>[0] = {
        user_login: userName,
        user_pass: userPassword,
        user_email: userEmail,
        user_url: siteUrl,
        role: "administrator",
      };

      if (!userPassword) {
        userPassword = generatePassword(12, false);
        userUpsert = {
          ...userUpsert,
          user_pass: userPassword,
          meta_input: {
            default_password_nag: "true",
          },
        };
      }

      userId = await this.trxUtil.user.upsert(userUpsert);

      if (!userId) {
        throw new Error(`Failed to create user - ${userEmail} ${userPassword}`);
      }
    }

    await this.trxUtil.seeder.populateContent(userId);

    return {
      url: siteUrl,
      userId,
      password: userPassword,
    };
  }
}
