import { z } from "zod";

import type * as val from "../validators";

export interface Tables {
  blogmeta: WpBlogMeta;
  blogs: WpBlogs;
  commentmeta: WpCommentMeta;
  comments: WpComments;
  links: WpLinks;
  options: WpOptions;
  postmeta: WpPostMeta;
  posts: WpPosts;
  registration_log: WpRegistrationLog;
  signups: WpSignups;
  site: WpSite;
  sitemeta: WpSiteMeta;
  termmeta: WpTermMeta;
  term_relationships: WpTermRelationships;
  term_taxonomy: WpTermTaxonomy;
  terms: WpTerms;
  users: WpUsers;
  usermeta: WpUserMeta;
}

export type TableNames = keyof Tables;
export type Columns<K extends TableNames> = keyof Tables[K];

export interface WpBlogMeta extends z.infer<typeof val.database.wpBlogMeta> {}
export interface WpBlogs extends z.infer<typeof val.database.wpBlogs> {}
export interface WpCommentMeta
  extends z.infer<typeof val.database.wpCommentMeta> {}
export interface WpComments extends z.infer<typeof val.database.wpComments> {}
export interface WpLinks extends z.infer<typeof val.database.wpLinks> {}
export interface WpOptions extends z.infer<typeof val.database.wpOptions> {}
export interface WpPostMeta extends z.infer<typeof val.database.wpPostMeta> {}
export interface WpPosts extends z.infer<typeof val.database.wpPosts> {}
export interface WpRegistrationLog
  extends z.infer<typeof val.database.wpRegistrationLog> {}
export interface WpSignups extends z.infer<typeof val.database.wpSignups> {}
export interface WpSite extends z.infer<typeof val.database.wpSite> {}
export interface WpSiteMeta extends z.infer<typeof val.database.wpSiteMeta> {}
export interface WpTermMeta extends z.infer<typeof val.database.wpTermMeta> {}
export interface WpTerms extends z.infer<typeof val.database.wpTerms> {}
export interface WpTermRelationships
  extends z.infer<typeof val.database.wpTermRelationships> {}
export interface WpTermTaxonomy
  extends z.infer<typeof val.database.wpTermTaxonomy> {}
export interface WpUserMeta extends z.infer<typeof val.database.wpUserMeta> {}
export interface WpUsers extends z.infer<typeof val.database.wpUsers> {}
