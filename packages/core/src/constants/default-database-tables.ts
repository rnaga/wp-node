import type * as types from "../types";

export const DEFAULT_DATABASE_TABLES = {
  blog: [
    "posts",
    "comments",
    "links",
    "options",
    "postmeta",
    "terms",
    "term_taxonomy",
    "term_relationships",
    "termmeta",
    "commentmeta",
  ] as types.TableNames[],
  global: ["users", "usermeta"] as types.TableNames[],
  ms_global: [
    "blogs",
    "blogmeta",
    "signups",
    "site",
    "sitemeta",
    "registration_log",
  ] as types.TableNames[],
};
