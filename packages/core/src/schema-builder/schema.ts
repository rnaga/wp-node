import type * as types from "../types";

const collate = "utf8mb4_unicode_520_ci";

export const blogMeta: types.Schema<"blogmeta"> = {
  name: "blogmeta",
  columns: (table) => ({
    meta_id: table.bigIncrements("meta_id").unsigned().notNullable().primary(),
    blog_id: table.bigint("blog_id").notNullable().defaultTo(0),
    meta_key: table.string("meta_key", 255).collate(collate),
    meta_value: table.text("meta_value", "longtext").collate(collate),
  }),
  indexes: (table, columns) => {
    columns.includes("blog_id") && table.index(["blog_id"], "blog_id");
  },
  raw: (builder, tables, columns) =>
    columns.includes("meta_key") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191))", [
      tables.get("blogmeta"),
      "meta_key",
      "meta_key",
    ]),
};

export const blogs: types.Schema<"blogs"> = {
  name: "blogs",
  columns: (table) => ({
    blog_id: table.bigIncrements("blog_id").primary(),
    site_id: table.bigint("site_id").notNullable().defaultTo(0),
    domain: table.string("domain", 200).notNullable().defaultTo(""),
    path: table.string("path", 100).notNullable().defaultTo(""),
    registered: table
      .datetime("registered")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    last_updated: table
      .datetime("last_updated")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    public: table.boolean("public").notNullable().defaultTo(true),
    archived: table.boolean("archived").notNullable().defaultTo(false),
    mature: table.boolean("mature").notNullable().defaultTo(false),
    spam: table.boolean("spam").notNullable().defaultTo(false),
    deleted: table.boolean("deleted").notNullable().defaultTo(false),
    lang_id: table.integer("lang_id").notNullable().defaultTo(0),
  }),
  indexes: (table, columns) => {
    columns.includes("land_id") && table.index("lang_id", "lang_id");
  },
  raw: (builder, tables, columns) =>
    columns.includes("domain") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(50), ??(5))", [
      tables.get("blogs"),
      "domain",
      "domain",
      "path",
    ]),
};

export const commentMeta: types.Schema<"commentmeta"> = {
  name: "commentmeta",
  columns: (table) => ({
    meta_id: table.bigIncrements("meta_id").unsigned().notNullable().primary(),
    comment_id: table
      .bigint("comment_id")
      .unsigned()
      .notNullable()
      .defaultTo(0),
    meta_key: table.string("meta_key", 255).collate(collate),
    meta_value: table.text("meta_value", "longtext").collate(collate),
  }),
  indexes: (table, columns) => {
    columns.includes("comment_id") && table.index(["comment_id"], "comment_id");
  },
  raw: (builder, tables, columns) =>
    columns.includes("meta_key") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191))", [
      tables.get("commentmeta"),
      "meta_key",
      "meta_key",
    ]),
};

export const comments: types.Schema<"comments"> = {
  name: "comments",
  columns: (table) => ({
    comment_ID: table
      .bigIncrements("comment_ID")
      .unsigned()
      .notNullable()
      .primary(),
    comment_post_ID: table
      .bigint("comment_post_ID")
      .unsigned()
      .notNullable()
      .defaultTo(0),
    comment_author: table.text("comment_author", "tinytext").notNullable(),
    comment_author_email: table
      .string("comment_author_email", 100)
      .notNullable()
      .defaultTo(""),
    comment_author_url: table
      .string("comment_author_url", 200)
      .notNullable()
      .defaultTo(""),
    comment_author_IP: table
      .string("comment_author_IP", 100)
      .notNullable()
      .defaultTo(""),
    comment_date: table
      .datetime("comment_date")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    comment_date_gmt: table
      .datetime("comment_date_gmt")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    comment_content: table.text("comment_content").notNullable(),
    comment_karma: table.integer("comment_karma").notNullable().defaultTo(0),
    comment_approved: table
      .string("comment_approved", 20)
      .notNullable()
      .defaultTo("1"),
    comment_agent: table
      .string("comment_agent", 255)
      .notNullable()
      .defaultTo(""),
    comment_type: table
      .string("comment_type", 20)
      .notNullable()
      .defaultTo("comment"),
    comment_parent: table
      .bigint("comment_parent")
      .unsigned()
      .notNullable()
      .defaultTo(0),
    user_id: table.bigint("user_id").unsigned().notNullable().defaultTo(0),
  }),
  indexes: (table, columns) => {
    columns.includes("comment_post_ID") &&
      table.index(["comment_post_ID"], "comment_post_ID");
    columns.includes("comment_approved") &&
      columns.includes("comment_date_gmt") &&
      table.index(
        ["comment_approved", "comment_date_gmt"],
        "comment_approved_date_gmt"
      );
    columns.includes("comment_date_gmt") &&
      table.index(["comment_date_gmt"], "comment_date_gmt");
    columns.includes("comment_parent") &&
      table.index(["comment_parent"], "comment_parent");
  },
  raw: (builder, tables, columns) =>
    columns.includes("comment_author_email") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(10))", [
      tables.get("comments"),
      "comment_author_email",
      "comment_author_email",
    ]),
};

export const links: types.Schema<"links"> = {
  name: "links",
  columns: (table) => ({
    link_id: table.bigIncrements("link_id").unsigned().notNullable().primary(),
    link_url: table.string("link_url", 255).notNullable().defaultTo(""),
    link_name: table.string("link_name", 255).notNullable().defaultTo(""),
    link_image: table.string("link_image", 255).notNullable().defaultTo(""),
    link_target: table.string("link_target", 25).notNullable().defaultTo(""),
    link_description: table
      .string("link_description", 255)
      .notNullable()
      .defaultTo(""),
    link_visible: table.string("link_visible", 20).notNullable().defaultTo("Y"),
    link_owner: table
      .bigint("link_owner")
      .unsigned()
      .notNullable()
      .defaultTo(1),
    link_rating: table.integer("link_rating").notNullable().defaultTo(0),
    link_updated: table
      .datetime("link_updated")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    link_rel: table.string("link_rel", 255).notNullable().defaultTo(""),
    link_notes: table.text("link_notes", "mediumtext").notNullable(),
    link_rss: table.string("link_rss", 255).notNullable().defaultTo(""),
  }),
  indexes: (table, columns) => {
    columns.includes("link_visible") &&
      table.index(["link_visible"], "link_visible");
  },
};

export const options: types.Schema<"options"> = {
  name: "options",
  columns: (table) => ({
    option_id: table
      .bigIncrements("option_id")
      .unsigned()
      .notNullable()
      .primary(),
    option_name: table.string("option_name", 191).notNullable().defaultTo(""),
    option_value: table.text("option_value", "longtext").notNullable(),
    autoload: table.string("autoload", 20).notNullable().defaultTo("yes"),
  }),
  indexes: (table, columns) => {
    columns.includes("option_name") &&
      table.unique(["option_name"], {
        indexName: "option_name",
      });
    columns.includes("autoload") && table.index(["autoload"], "autoload");
  },
};

export const postMeta: types.Schema<"postmeta"> = {
  name: "postmeta",
  columns: (table) => ({
    meta_id: table.bigIncrements("meta_id").unsigned().notNullable().primary(),
    post_id: table.bigint("post_id").unsigned().notNullable().defaultTo(0),
    meta_key: table.string("meta_key", 255).collate(collate),
    meta_value: table.text("meta_value", "longtext").collate(collate),
  }),
  indexes: (table, columns) => {
    columns.includes("post_id") && table.index(["post_id"], "post_id");
  },
  raw: (builder, tables, columns) =>
    columns.includes("meta_key") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191))", [
      tables.get("postmeta"),
      "meta_key",
      "meta_key",
    ]),
};

export const posts: types.Schema<"posts"> = {
  name: "posts",
  columns: (table) => ({
    ID: table.bigIncrements("ID").unsigned().notNullable().primary(),
    post_author: table
      .bigint("post_author")
      .unsigned()
      .notNullable()
      .defaultTo(0),
    post_date: table
      .datetime("post_date")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    post_date_gmt: table
      .datetime("post_date_gmt")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    post_content: table.text("post_content", "longtext").notNullable(),
    post_title: table.text("post_title").notNullable(),
    post_excerpt: table.text("post_excerpt").notNullable(),
    post_status: table
      .string("post_status", 20)
      .notNullable()
      .defaultTo("publish"),
    comment_status: table
      .string("comment_status", 20)
      .notNullable()
      .defaultTo("open"),
    ping_status: table
      .string("ping_status", 20)
      .notNullable()
      .defaultTo("open"),
    post_password: table
      .string("post_password", 255)
      .notNullable()
      .defaultTo(""),
    post_name: table.string("post_name", 200).notNullable().defaultTo(""),
    to_ping: table.text("to_ping").notNullable(),
    pinged: table.text("pinged").notNullable(),
    post_modified: table
      .datetime("post_modified")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    post_modified_gmt: table
      .datetime("post_modified_gmt")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    post_content_filtered: table
      .text("post_content_filtered", "longtext")
      .notNullable(),
    post_parent: table
      .bigint("post_parent")
      .unsigned()
      .notNullable()
      .defaultTo(0),
    guid: table.string("guid", 255).notNullable().defaultTo(""),
    menu_order: table.integer("menu_order").notNullable().defaultTo(0),
    post_type: table.string("post_type", 20).notNullable().defaultTo("post"),
    post_mime_type: table
      .string("post_mime_type", 100)
      .notNullable()
      .defaultTo(""),
    comment_count: table.bigint("comment_count").notNullable().defaultTo(0),
  }),
  indexes: (table, columns) => {
    columns.includes("ID") &&
      table.index(
        ["post_type", "post_status", "post_date", "ID"],
        "type_status_date"
      );
    table.index(["post_parent"], "post_parent");
    table.index(["post_author"], "post_author");
  },
  raw: (builder, tables, columns) =>
    columns.includes("post_name") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191))", [
      tables.get("posts"),
      "post_name",
      "post_name",
    ]),
};

export const registrationLog: types.Schema<"registration_log"> = {
  name: "registration_log",
  columns: (table) => ({
    ID: table.bigIncrements("ID").notNullable().primary(),
    email: table.string("email", 255).notNullable().defaultTo(""),
    IP: table.string("IP", 30).notNullable().defaultTo(""),
    blog_id: table.bigint("blog_id").notNullable().defaultTo(0),
    date_registered: table
      .datetime("date_registered")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
  }),
  indexes: (table, columns) => {
    columns.includes("IP") && table.index(["IP"], "IP");
  },
};

export const signups: types.Schema<"signups"> = {
  name: "signups",
  columns: (table) => ({
    signup_id: table.bigIncrements("signup_id").notNullable().primary(),
    domain: table.string("domain", 200).notNullable().defaultTo(""),
    path: table.string("path", 100).notNullable().defaultTo(""),
    title: table.text("title", "longtext").notNullable(),
    user_login: table.string("user_login", 60).notNullable().defaultTo(""),
    user_email: table.string("user_email", 100).notNullable().defaultTo(""),
    registered: table
      .datetime("registered")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    activated: table
      .datetime("activated")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    active: table.boolean("active").notNullable().defaultTo(false),
    activation_key: table
      .string("activation_key", 50)
      .notNullable()
      .defaultTo(""),
    meta: table.text("meta", "longtext"),
  }),
  indexes: (table, columns) => {
    columns.includes("activation_key") &&
      table.index(["activation_key"], "activation_key");
    columns.includes("user_email") && table.index(["user_email"], "user_email");
    columns.includes("user_login") &&
      columns.includes("user_email") &&
      table.index(["user_login", "user_email"], "user_login_email");
  },
  raw: (builder, tables) =>
    builder("ALTER TABLE ?? ADD KEY ?? (??(140), ??(51))", [
      tables.get("signups"),
      "domain_path",
      "domain",
      "path",
    ]),
};

export const site: types.Schema<"site"> = {
  name: "site",
  columns: (table) => ({
    id: table.bigIncrements("id").notNullable().primary(),
    domain: table.string("domain", 200).notNullable().defaultTo(""),
    path: table.string("path", 100).notNullable().defaultTo(""),
  }),
  raw: (builder, tables, columns) =>
    columns.includes("domain") &&
    columns.includes("path") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(140), ??(51))", [
      tables.get("site"),
      "domain",
      "domain",
      "path",
    ]),
};

export const siteMeta: types.Schema<"sitemeta"> = {
  name: "sitemeta",
  columns: (table) => ({
    meta_id: table.bigIncrements("meta_id").notNullable().primary(),
    site_id: table.bigint("site_id").notNullable().defaultTo(0),
    meta_key: table.string("meta_key", 255).collate(collate),
    meta_value: table.text("meta_value", "longtext").collate(collate),
  }),
  indexes: (table, columns) => {
    columns.includes("site_id") && table.index(["site_id"], "site_id");
  },
  raw: (builder, tables, columns) =>
    columns.includes("meta_key") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191))", [
      tables.get("sitemeta"),
      "meta_key",
      "meta_key",
    ]),
};

export const termMeta: types.Schema<"termmeta"> = {
  name: "termmeta",
  columns: (table) => ({
    meta_id: table.bigIncrements("meta_id").unsigned().notNullable().primary(),
    term_id: table.bigint("term_id").unsigned().notNullable().defaultTo(0),
    meta_key: table.string("meta_key", 255).collate(collate),
    meta_value: table.text("meta_value", "longtext").collate(collate),
  }),
  indexes: (table, columns) => {
    columns.includes("term_id") && table.index(["term_id"], "term_id");
  },
  raw: (builder, tables, columns) =>
    columns.includes("meta_key") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191))", [
      tables.get("termmeta"),
      "meta_key",
      "meta_key",
    ]),
};

export const terms: types.Schema<"terms"> = {
  name: "terms",
  columns: (table) => ({
    term_id: table.bigIncrements("term_id").unsigned().notNullable().primary(),
    name: table.string("name", 200).notNullable().defaultTo(""),
    slug: table.string("slug", 200).notNullable().defaultTo(""),
    term_group: table.bigint("term_group").notNullable().defaultTo(0),
  }),
  raw: (builder, tables, columns) =>
    columns.includes("slug") &&
    columns.includes("name") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191)), ADD KEY ?? (??(191))", [
      tables.get("terms"),
      "slug",
      "slug",
      "name",
      "name",
    ]),
};

export const termRelationships: types.Schema<"term_relationships"> = {
  name: "term_relationships",
  columns: (table) => ({
    object_id: table.bigint("object_id").unsigned().notNullable().defaultTo(0),
    term_taxonomy_id: table
      .bigint("term_taxonomy_id")
      .unsigned()
      .notNullable()
      .defaultTo(0),
    term_order: table.integer("term_order").notNullable().defaultTo(0),
  }),
  indexes: (table, columns) => {
    // Note: The primary key is a composite key, which is defined in the table structure below
    columns.includes("term_taxonomy_id") &&
      table.index(["term_taxonomy_id"], "term_taxonomy_id");
    columns.includes("object_id") &&
      columns.includes("term_taxonomy_id") &&
      table.primary(["object_id", "term_taxonomy_id"], {
        constraintName: "term_taxonomy_id",
      });
  },
};

export const termTaxonomy: types.Schema<"term_taxonomy"> = {
  name: "term_taxonomy",
  columns: (table) => ({
    term_taxonomy_id: table
      .bigIncrements("term_taxonomy_id")
      .unsigned()
      .notNullable()
      .primary(),
    term_id: table.bigint("term_id").unsigned().notNullable().defaultTo(0),
    taxonomy: table.string("taxonomy", 32).notNullable().defaultTo(""),
    description: table.text("description", "longtext").notNullable(),
    parent: table.bigint("parent").unsigned().notNullable().defaultTo(0),
    count: table.bigint("count").notNullable().defaultTo(0),
  }),
  indexes: (table, columns) => {
    // Since 'term_id_taxonomy' is a unique key, it's handled differently from a regular index
    columns.includes("term_id") &&
      columns.includes("taxonomy") &&
      table.unique(["term_id", "taxonomy"], {
        indexName: "term_id_taxonomy",
      });
    columns.includes("taxonomy") && table.index(["taxonomy"], "taxonomy");
  },
};

export const userMeta: types.Schema<"usermeta"> = {
  name: "usermeta",
  columns: (table) => ({
    umeta_id: table
      .bigIncrements("umeta_id")
      .unsigned()
      .notNullable()
      .primary(),
    user_id: table.bigint("user_id").unsigned().notNullable().defaultTo(0),
    meta_key: table.string("meta_key", 255).collate(collate),
    meta_value: table.text("meta_value", "longtext").collate(collate),
  }),
  indexes: (table, columns) => {
    columns.includes("user_id") && table.index(["user_id"], "user_id");
  },
  raw: (builder, tables, columns) =>
    columns.includes("meta_key") &&
    builder("ALTER TABLE ?? ADD KEY ?? (??(191))", [
      tables.get("usermeta"),
      "meta_key",
      "meta_key",
    ]),
};

export const users: types.Schema<"users"> = {
  name: "users",
  columns: (table, config) => ({
    ID: table.bigIncrements("ID").unsigned().notNullable().primary(),
    user_login: table.string("user_login", 60).notNullable().defaultTo(""),
    user_pass: table.string("user_pass", 255).notNullable().defaultTo(""),
    user_nicename: table
      .string("user_nicename", 50)
      .notNullable()
      .defaultTo(""),
    user_email: table.string("user_email", 100).notNullable().defaultTo(""),
    user_url: table.string("user_url", 100).notNullable().defaultTo(""),
    user_registered: table
      .datetime("user_registered")
      .notNullable()
      .defaultTo("0000-00-00 00:00:00"),
    user_activation_key: table
      .string("user_activation_key", 255)
      .notNullable()
      .defaultTo(""),
    user_status: table.integer("user_status").notNullable().defaultTo(0),
    display_name: table.string("display_name", 250).notNullable().defaultTo(""),
    spam: config?.isMultiSite()
      ? table.tinyint("spam").notNullable().defaultTo(0)
      : undefined,
    deleted: config?.isMultiSite()
      ? table.tinyint("deleted").notNullable().defaultTo(0)
      : undefined,
  }),
  indexes: (table, columns) => {
    columns.includes("user_login") &&
      table.index(["user_login"], "user_login_key");
    columns.includes("user_nicename") &&
      table.index(["user_nicename"], "user_nicename");
    columns.includes("user_email") && table.index(["user_email"], "user_email");
  },
};
