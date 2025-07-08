import type * as types from "../types";
export const taxonomyNames = [
  "category",
  "post_tag",
  "post_format",
  "link_category",
] as const;
export const taxonomyObjectTypes = ["post", "link"] as const;

// /wp-includes/taxonomy.php
// register_taxonomy
export const taxonomies: Partial<types.TaxonomyRecord> = {
  category: {
    objectType: "post",
    hierarchical: true,
    _builtin: true,
    showUi: true,
    capabilities: {
      manage_terms: "manage_categories",
      edit_terms: "edit_categories",
      delete_terms: "delete_categories",
      assign_terms: "assign_categories",
    },
  },
  post_tag: {
    objectType: "post",
    hierarchical: false,
    _builtin: true,
    showUi: true,
    capabilities: {
      manage_terms: "manage_post_tags",
      edit_terms: "edit_post_tags",
      delete_terms: "delete_post_tags",
      assign_terms: "assign_post_tags",
    },
  },
  post_format: {
    objectType: "post",
    hierarchical: false,
    _builtin: true,
    showUi: false,
    //capabilities: {},
  },
  link_category: {
    objectType: "link",
    hierarchical: false,
    _builtin: true,
    showUi: true,
    capabilities: {
      manage_terms: "manage_links",
      edit_terms: "manage_links",
      delete_terms: "manage_links",
      assign_terms: "manage_links",
    },
  },
};
