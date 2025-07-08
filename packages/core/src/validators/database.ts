import { z } from "zod";
import { mySQLDate, mySQLDateWithZeroDefaultDate } from "./date";
import { formatting } from "../common";
//import { undefinedIfEmptyString } from "./helpers";

// Define the schema for the `wp_blogmeta` table
export const wpBlogMeta = z.object({
  meta_id: z.number().int().nonnegative(),
  blog_id: z.number().int().nonnegative().default(0),
  meta_key: z.string().trim().max(255).nullable(),
  meta_value: z.string().trim().nullable(),
});

// Define the schema for the `wp_blogs` table
export const wpBlogs = z.object({
  blog_id: z.number().int().nonnegative(),
  site_id: z.number().int().nonnegative().default(0),
  domain: z.string().max(200).trim().default(""),
  path: z.string().max(100).trim().default("/"),
  registered: mySQLDate,
  last_updated: mySQLDate,
  public: z.number().max(1).nonnegative().default(1),
  archived: z.number().max(1).nonnegative().default(0),
  mature: z.number().max(1).nonnegative().default(0),
  spam: z.number().max(1).nonnegative().default(0),
  deleted: z.number().max(1).nonnegative().default(0),
  lang_id: z.number().int().default(0),
});

// Define the schema for the `wp_commentmeta` table
export const wpCommentMeta = z.object({
  meta_id: z.number().int().nonnegative(),
  comment_id: z.number().int().nonnegative().default(0),
  meta_key: z.string().max(255).trim().nullable(),
  meta_value: z.string().trim().nullable(),
});

// Define the schema for the `wp_comments` table
export const wpComments = z.object({
  comment_ID: z.number().int().nonnegative(),
  comment_post_ID: z.number().int().nonnegative().default(0),
  comment_author: z.string().trim().max(245).default(""),
  // comment_author: z.union([
  //   z.string().max(245).trim().transform(undefinedIfEmptyString),
  //   z.string().max(0).optional(),
  // ]),
  comment_author_email: z.union([
    z.string().max(100).email().trim(), //.transform(undefinedIfEmptyString),
    z.string().max(0).optional(),
  ]),
  comment_author_url: z.union([
    z.string().url().max(100).trim().default(""),
    z.string().max(0).optional(),
  ]),
  comment_author_IP: z.union([
    z.string().trim().max(100).ip().default(""),
    z.string().max(0).optional(),
  ]),
  comment_date: mySQLDate,
  comment_date_gmt: mySQLDate,
  comment_content: z.string().trim().max(65525).default(""),
  comment_karma: z.number().int().default(0),
  comment_approved: z.union([
    z.number().max(1).nonnegative().default(1),
    z.enum(["0", "1", "spam", "trash", "post-trashed", "approve", "hold"]),
  ]),
  comment_agent: z.string().max(255).trim().default(""),
  comment_type: z.string().max(20).trim().min(1).default("comment"),
  comment_parent: z.number().int().nonnegative().default(0),
  user_id: z.number().int().nonnegative().default(0),
});

// Define the schema for the `wp_links` table
export const wpLinks = z.object({
  link_id: z.number().int().nonnegative(),
  link_url: z.string().max(255).url().trim(),
  link_name: z.string().max(255).trim(),
  link_image: z.string().max(255).trim().default(""),
  link_target: z.string().max(25).trim().default(""),
  link_description: z.string().max(255).trim().default(""),
  link_visible: z.string().max(20).trim().default("Y"),
  link_owner: z.number().int().nonnegative().default(1),
  link_rating: z.number().int().default(0),
  link_updated: mySQLDate,
  link_rel: z.string().max(255).trim().default(""),
  link_notes: z.string().trim().optional().default(""),
  link_rss: z.union([
    z.string().max(255).url().trim(), //.transform(undefinedIfEmptyString),
    z.string().max(0).optional().default(""),
  ]),
});

// Define the schema for the `wp_options` table
export const wpOptions = z.object({
  option_id: z.number().int().nonnegative(),
  option_name: z.string().max(191).trim().default(""),
  option_value: z.string().trim(),
  autoload: z.string().max(20).trim().default("yes"),
});

// Define the schema for the `wp_postmeta` table
export const wpPostMeta = z.object({
  meta_id: z.number().int().nonnegative(),
  post_id: z.number().int().nonnegative().default(0),
  meta_key: z.string().max(255).trim().nullable(),
  meta_value: z.string().trim().nullable(),
});

// Define the schema for the `wp_posts` table
export const wpPosts = z.object({
  ID: z.number().int().nonnegative(),
  post_author: z.number().int().nonnegative().default(0),
  post_date: mySQLDate,
  post_date_gmt: mySQLDate,
  post_content: z.string().trim().default(""),
  post_title: z.string().max(65535).trim().default(""), // text type max length in MySQL
  post_excerpt: z.string().max(65535).trim().default(""), // text type max length in MySQL
  post_status: z.string().max(20).trim().default("publish"),
  comment_status: z.string().max(20).trim().default("open"),
  ping_status: z.string().max(20).trim().default("open"),
  post_password: z.string().max(255).trim().default(""),
  post_name: z.string().max(200).trim().default(""),
  to_ping: z.string().max(65535).trim().default(""), // text type max length in MySQL
  pinged: z.string().max(65535).trim().default(""), // text type max length in MySQL
  post_modified: mySQLDate,
  post_modified_gmt: mySQLDate,
  post_content_filtered: z.string().trim().default(""),
  post_parent: z.number().int().nonnegative().default(0),
  guid: z.string().max(255).trim().default(""),
  menu_order: z.number().int().default(0),
  post_type: z.string().max(20).trim().default("post"),
  post_mime_type: z.string().max(100).trim().default(""),
  comment_count: z.number().int().nonnegative().default(0),
});

// Define the schema for the `wp_registration_log` table
export const wpRegistrationLog = z.object({
  ID: z.number().int().nonnegative(),
  email: z.string().email().trim(),
  IP: z.union([z.string().ip().trim(), z.string().max(0).optional()]),
  blog_id: z.number().int().nonnegative(),
  date_registered: mySQLDate,
});

// Define the schema for the `wp_signups` table
export const wpSignups = z.object({
  signup_id: z.number().int().nonnegative(),
  domain: z.string().max(200).trim().default(""),
  path: z.string().max(100).trim().default(""),
  title: z.string().trim(),
  user_login: z.string().max(60).trim().default(""),
  user_email: z.string().email().max(100).trim().default(""),
  registered: mySQLDate,
  activated: mySQLDate,
  active: z.number().max(1).nonnegative().default(0),
  activation_key: z.string().max(50).trim().default(""),
  meta: z
    .string()
    .trim()
    .nullable()
    .transform((v) => formatting.primitive(v)),
});

// Define the schema for the `wp_site` table
export const wpSite = z.object({
  id: z.number().int().nonnegative(),
  domain: z.string().max(200).trim().default(""),
  path: z.string().max(100).trim().default(""),
});

// Define the schema for the `wp_sitemeta` table
export const wpSiteMeta = z.object({
  meta_id: z.number().int().nonnegative(),
  site_id: z.number().int().nonnegative().default(0),
  meta_key: z.string().max(255).trim().nullable(),
  meta_value: z.string().trim().nullable(),
});

// Define the schema for the `wp_termmeta` table
export const wpTermMeta = z.object({
  meta_id: z.number().int().nonnegative(),
  term_id: z.number().int().nonnegative().default(0),
  meta_key: z.string().max(255).trim().nullable(),
  meta_value: z.string().trim().nullable(),
});

// Define the schema for the `wp_terms` table
export const wpTerms = z.object({
  term_id: z.number().int().nonnegative(),
  name: z.string().max(200).trim(),
  slug: z
    .string()
    .max(200)
    .transform((v) => formatting.slug(v)),
  term_group: z.number().default(0),
});

// Define the schema for the `wp_term_relationships` table
export const wpTermRelationships = z.object({
  object_id: z.number().int().nonnegative().default(0),
  term_taxonomy_id: z.number().int().nonnegative().default(0),
  term_order: z.number().int().default(0),
});

// Define the schema for the `wp_term_taxonomy` table
export const wpTermTaxonomy = z.object({
  term_taxonomy_id: z.number().int().nonnegative(),
  term_id: z.number().int().nonnegative().default(0),
  taxonomy: z.string().max(32).trim().default(""),
  description: z.string().trim().default(""),
  parent: z.number().int().nonnegative().default(0),
  count: z.number().int().nonnegative().default(0),
});

// Define the schema for the `wp_usermeta` table
export const wpUserMeta = z.object({
  umeta_id: z.number().int().nonnegative(),
  user_id: z.number().int().nonnegative().default(0),
  meta_key: z.string().max(255).trim().nullable(),
  meta_value: z.string().trim().nullable(),
});

// Define the schema for the `wp_users` table
export const wpUsers = z.object({
  ID: z.number().int().nonnegative(),
  user_login: z.string().max(60).trim().toLowerCase().default(""),
  user_pass: z.string().max(255).trim().default(""),
  user_nicename: z.string().max(50).trim().default(""),
  user_email: z.string().email().max(100).trim().default(""),
  user_url: z.union([
    z.string().url().max(100).trim().default(""),
    z.string().max(0).optional(),
  ]),
  user_registered: mySQLDateWithZeroDefaultDate,
  user_activation_key: z.string().max(255).trim().default(""),
  user_status: z.number().int().default(0),
  display_name: z.string().max(250).trim().default(""),
  spam: z.number().max(1).nonnegative().default(0),
  deleted: z.number().max(1).nonnegative().default(0),
});

export const wpTables = {
  blogmeta: wpBlogMeta,
  blogs: wpBlogs,
  commentmeta: wpCommentMeta,
  comments: wpComments,
  links: wpLinks,
  options: wpOptions,
  postmeta: wpPostMeta,
  posts: wpPosts,
  registration_log: wpRegistrationLog,
  signups: wpSignups,
  site: wpSite,
  sitemeta: wpSiteMeta,
  termmeta: wpTermMeta,
  term_relationships: wpTermRelationships,
  term_taxonomy: wpTermTaxonomy,
  terms: wpTerms,
  users: wpUsers,
  usermeta: wpUserMeta,
};
