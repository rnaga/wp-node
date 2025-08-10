import { z } from "zod";
import * as trx from "./transactions";
import {
  numberWithDefault,
  number,
  numberArr,
  stringArr,
  boolean,
  path,
} from "./helpers";

export const postListParams = z.object({
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  search: z.string().trim().optional(),
  after: z.string().optional(), // Validate as ISO8601 date if needed
  modified_after: z.string().optional(), // Validate as ISO8601 date if needed
  author: numberArr.optional(),
  author_exclude: numberArr.optional(),
  before: z.string().optional(), // Validate as ISO8601 date if needed
  modified_before: z.string().optional(), // Validate as ISO8601 date if needed
  exclude: numberArr.optional(),
  include: numberArr.optional(),
  offset: number.optional(),
  order: z.union([z.literal("asc"), z.literal("desc")]).default("desc"),
  orderby: z
    .union([
      z.literal("post_author"),
      z.literal("post_date"),
      z.literal("ID"),
      z.literal("post_modified"),
      z.literal("post_parent"),
      z.literal("post_name"),
      z.literal("post_title"),
    ])
    .default("post_date"),
  slug: stringArr.optional(),
  status: stringArr.optional(), // Define specific statuses if needed
  status_exclude: z.array(z.string()).optional(),
  tax_relation: z.union([z.literal("AND"), z.literal("OR")]).optional(),
  categories: numberArr.optional(),
  categories_exclude: numberArr.optional(),
  tags: numberArr.optional(),
  tags_exclude: numberArr.optional(),
  meta: z.object({ key: z.string(), value: z.string() }).optional(),
  exclude_meta: z
    .object({ key: z.string(), value: z.union([z.string(), z.undefined()]) })
    .optional(),
  sticky: boolean.optional(),
});

export const userListParams = z.object({
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  blog_id: number.optional(),
  site_id: number.optional(),
  search: z.string().optional(),
  exclude: numberArr.optional(),
  exclude_anonymous: boolean.optional(),
  include: numberArr.optional(),
  include_unregistered_users: boolean.optional(),
  superadmins: boolean.optional(),
  offset: number.optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  orderby: z
    .enum([
      "ID",
      "display_name",
      "user_login",
      "user_registered",
      "user_email",
      "user_url",
    ])
    .default("display_name"),
  slug: z.array(z.string()).optional(),
  roles: z
    .union([z.string().transform((v) => v.split(",")), z.array(z.string())])
    .optional(),
  has_published_posts: boolean.optional(),
});

export const metaListParams = z.object({
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  search: z.string().optional(),
  exclude: numberArr.optional(),
  include: numberArr.optional(),
  offset: number.optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  orderby: z.enum(["meta_id", "meta_key", "meta_value"]).default("meta_id"),
});

export const termListParams = z.object({
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  search: z.string().optional(),
  exclude: numberArr.optional(),
  include: numberArr.optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  orderby: z
    .enum([
      "term_id",
      "name",
      "slug",
      "term_group",
      "term_order",
      "description",
    ])
    .default("name"),
  hide_empty: boolean.optional(),
  parent: number.optional(),
  post: number.optional(),
  slug: z.array(z.string()).optional(),
});

export const commentListParams = z.object({
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  search: z.string().optional(),
  after: z.string().optional(), // assuming ISO8601 date as string
  author: numberArr.optional(), // array of user IDs
  author_exclude: numberArr.optional(), // array of user IDs
  author_email: z.string().optional(),
  before: z.string().optional(), // assuming ISO8601 date as string
  exclude: numberArr.optional(), // array of IDs
  include: numberArr.optional(), // array of IDs
  offset: number.optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  orderby: z
    .enum([
      "comment_author",
      "comment_date",
      "comment_date_gmt",
      "comment_ID",
      "comment_post_ID",
      "comment_parent",
      "comment_type",
    ])
    .default("comment_date_gmt"),
  parent: numberArr.optional(), // array of parent IDs
  parent_exclude: numberArr.optional(), // array of parent IDs
  post: numberArr.optional(), // array of post IDs
  status: z.string().default("approve").optional(),
  type: z.string().default("comment").optional(),
  password: z.string().optional(),
});

export const settings = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  home: z.string().optional(),
  email: z.email().optional(),
  timezone: z.string().optional(),
  date_format: z.string().optional(),
  time_format: z.string().optional(),
  start_of_week: number.optional(),
  use_smilies: number.optional(),
  default_category: number.optional(),
  default_post_format: number.optional(),
  posts_per_page: number.optional(),
  show_on_front: z.string().optional(),
  page_on_front: number.optional(),
  page_for_posts: number.optional(),
  default_ping_status: z.enum(["open", "closed"]).optional(),
  default_comment_status: z.enum(["open", "closed"]).optional(),
  site_icon: number.optional(),
  // comment_require_name_email: z.enum(["0", "1"]).optional(),
  // comment_registration: z.enum(["0", "1"]).optional(),
  // comment_previously_approved: z.enum(["0", "1"]).optional(),
  // comment_moderation: z.enum(["0", "1"]).optional(),
  // comment_max_links: number.optional(),
  // comment_moderation_keys: z.string().optional(),
  // comment_disallowed_keys: z.string().optional(),
});

export const blogListParams = z.object({
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  offset: number.optional(),
  search: z.string().optional(),
  exclude: numberArr.optional(),
  include: numberArr.optional(),
  site_id: number.optional(),
  site: numberArr.optional(), // array of user IDs
  site_exclude: numberArr.optional(), // array of user IDs
  domain: z.string().max(200).trim().optional(),
  path: z.string().max(100).trim().optional(),
  public: z.number().max(1).nonnegative().optional(),
  archived: z.number().max(1).nonnegative().optional(),
  mature: z.number().max(1).nonnegative().optional(),
  spam: z.number().max(1).nonnegative().optional(),
  deleted: z.number().max(1).nonnegative().optional(),
  lang_id: z.number().int().nonnegative().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  orderby: z
    .enum(["blog_id", "domain", "path", "url", "registered", "last_updated"])
    .default("blog_id"),
});

export const blogUpdate = trx.blogUpsertBase.merge(
  z.object({
    blog_id: z.number().int().nonnegative(),
  })
);

export const blogInsert = z.object({
  user_id: z.number().int().nonnegative().optional(),
  title: z.string().min(3),
  domain: z
    .string()
    .min(1)
    .refine((v) => /^([a-zA-Z0-9-])+$/.test(v))
    .transform((v) => v.toLowerCase()),
  path: path,
});

export const siteListParams = z.object({
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  offset: z.number().optional(),
  search: z.string().optional(),
  exclude: numberArr.optional(),
  include: numberArr.optional(),
  domain_exclude: stringArr.optional(),
  domain: stringArr.optional(),
  path: z.string().max(100).trim().optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  orderby: z.enum(["id", "domain", "path"]).default("id"),
});

export const siteInsert = z.object({
  domain: z
    .string()
    .regex(/^[a-z0-9\\.-]+$/)
    .refine((value) => !/^[0-9]*$/.test(value)),
  path: path,
  site_name: z.string(),
});

export const revisionListParams = z.object({
  parent: number.optional(),
  page: numberWithDefault(1),
  per_page: numberWithDefault(10),
  search: z.string().optional(),
  exclude: numberArr.optional(),
  include: numberArr.optional(),
  offset: number.optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  orderby: z
    .union([
      z.literal("post_date"),
      z.literal("ID"),
      z.literal("post_modified"),
      z.literal("post_name"),
      z.literal("post_title"),
    ])
    .default("post_date"),
});

export const rolesCountListParams = z.object({
  site_id: number.optional(),
  blog_id: number.optional(),
});

export const rolesListParams = z.object({
  blog_ids: numberArr,
});
