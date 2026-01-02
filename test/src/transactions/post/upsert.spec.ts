import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { PostTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";

test("defaults", async () => {
  const defaults = val.trx.postUpsert.parse({});
  expect(defaults.comment_status).toBe("open");
});

test("with input", async () => {
  const input: Partial<z.infer<typeof val.trx.postUpsert>> = {
    post_author: 1,
    post_name: "test",
    post_category: [1, 2, 3],
  };

  const result = val.trx.postUpsert.parse(input);
  expect(result.post_name).toBe("test");
});

test("upsert", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const postId = await postTrx.upsert({
    // ID: 345,
    post_author: 1,
    post_title: "test title",
    post_name: "test",
    post_type: "post",
    //post_category: categoryIds,
    //tags_input: ["tag1", "tag2", "tag3", "tag4"],
    tax_input: {
      custom: ["term1", "term2", "term3"],
    },
  });

  // Check if terms for custom taxonomy are created
  const terms = await queryUtil.terms((query) => {
    query.withObjectIds([postId]);
  });

  const taxonomyNames = terms?.map((term) => term.taxonomy) ?? [];
  expect(taxonomyNames).toContain("custom");
});

test("slug", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const postUtil = context.components.get(PostUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const postIdWithNoSlug = await postTrx.upsert({
    post_author: 1,
    post_title: `Test Slug Title ${Math.floor(Math.random() * 100000)}`,
    post_type: "post",
    post_status: "publish",
  });

  const postWithNoSlug = await postUtil.get(postIdWithNoSlug);
  expect(postWithNoSlug.props?.post_name).toContain("test-slug-title");

  // slug with space
  const postIdWithSpacesInSlug = await postTrx.upsert({
    post_author: 1,
    post_title: `Test Slug Title ${Math.floor(Math.random() * 100000)}`,
    post_type: "post",
    post_status: "publish",
    post_name: " ",
  });
  const postWithSpacesInSlug = await postUtil.get(postIdWithSpacesInSlug);
  expect(postWithSpacesInSlug.props?.post_name).toContain("test-slug-title");

  // slug with newlines and tabs
  const postIdWithWhitespace = await postTrx.upsert({
    post_author: 1,
    post_title: `Test Slug Title ${Math.floor(Math.random() * 100000)}`,
    post_type: "post",
    post_status: "publish",
    post_name: "\n\ttest-slug\n\t",
  });
  const postWithWhitespace = await postUtil.get(postIdWithWhitespace);
  expect(postWithWhitespace.props?.post_name).toContain("test-slug");

  // slug with only newlines and tabs (should generate slug from title)
  const postIdWithOnlyWhitespace = await postTrx.upsert({
    post_author: 1,
    post_title: `Test Whitespace ${Math.floor(Math.random() * 100000)}`,
    post_type: "post",
    post_status: "publish",
    post_name: "\n\t\n\t",
  });
  const postWithOnlyWhitespace = await postUtil.get(postIdWithOnlyWhitespace);
  expect(postWithOnlyWhitespace.props?.post_name).toContain("test-whitespace");
});
