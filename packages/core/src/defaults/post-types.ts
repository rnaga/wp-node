import type * as types from "../types";

// WordPress/wp-includes/post.php
// create_initial_post_types
// register_post_type
export const postTypes = ["post", "page", "attachment", "revision"] as const;

export const postTypeObject: types.PostTypeObject = {
  post: {
    capabilityType: "post", // This is used to assign cap mapping. see Capabilities.getCapabilities
    supports: [
      "title",
      "editor",
      "author",
      "thumbnail",
      "excerpt",
      "trackbacks",
      "custom-fields",
      "comments",
      "revisions",
      "post-formats",
    ],
    public: true,
    _builtin: true,
    deleteWithUser: true,
    mapMetaCap: true,
    showInRest: true,
  },
  page: {
    capabilityType: "page",
    supports: [
      "title",
      "editor",
      "author",
      "thumbnail",
      "page-attributes",
      "custom-fields",
      "comments",
      "revisions",
    ],
    public: true,
    _builtin: true,
    publiclyQueryable: false,
    deleteWithUser: true,
    mapMetaCap: true,
    // see wp_unique_post_slug or is_post_type_hierarchical
    hierarchical: true,
    showInRest: true,
  },
  attachment: {
    capabilityType: "post",
    supports: ["title", "author", "comments"],
    public: true,
    _builtin: true,
    deleteWithUser: true,
    mapMetaCap: true,
    // Used by Capabilities.determine or mapMetaCap
    capabilities: {
      create_posts: "upload_files",
    },
    showInRest: true,
  },
  revision: {
    capabilityType: "post",
    supports: ["author"],
    deleteWithUser: true,
    public: false,
    _builtin: true,
    mapMetaCap: true,
    showInRest: true,
  },
};
