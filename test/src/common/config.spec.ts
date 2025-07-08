import * as config from "@rnaga/wp-node/common/config";

declare module "@rnaga/wp-node/types/taxonomy.d" {
  interface TaxonomyNameExtend {
    custom: true;
  }
}

test("taxonomies", () => {
  const taxonomies = config.defineTaxonomies({
    custom: {
      hierarchical: true,
      showUi: false,
      capabilities: {
        manage_terms: "manage_terms",
        assign_terms: "assign_terms",
        edit_terms: "edit_tems",
        delete_terms: "delete_terms",
      },
    },
  });

  expect(taxonomies.custom._builtin).toBe(false);
});

declare module "@rnaga/wp-node/types/post.d" {
  interface PostStatusExtend {
    custom: true;
  }
}

test("postStatus", () => {
  const postStatus = config.definePostStatus({
    custom: {
      public: false,
      private: true,
    },
  });

  expect(postStatus.custom.label).toBe("custom");
  expect(postStatus.custom._builtin).toBe(false);
});

declare module "@rnaga/wp-node/types/post.d" {
  interface PostTypeExtend {
    custom: true;
  }
}

test("postType", () => {
  const postType = config.definePostType({
    custom: {
      capabilityType: "custom",
      public: false,
    },
  });

  expect(postType.custom.capabilityType).toBe("custom");
  expect(postType.custom.public).toBe(false);
  expect(postType.custom._builtin).toBe(false);
});
