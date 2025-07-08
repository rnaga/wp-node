import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TaxonomyUtil } from "@rnaga/wp-node/core/utils/taxonomy.util";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";

test("sync terms object", async () => {
  const context = await Application.getContext("single");
  const termTrx = context.components.get(TermTrx);
  const queryUtil = context.components.get(QueryUtil);

  const testSlug = "__syncobject_test_";

  const post = ((await queryUtil.posts((query) => {
    query
      .where("ID", 2, ">")
      .where("post_status", "publish")
      .where("post_type", "post")
      .builder.limit(1);
  })) ?? [])[0];

  if (!post) throw new Error("post not found");

  console.log("Post ID to sync term object", post.ID);
  await termTrx.syncObject(post.ID, [testSlug], "category");

  let terms =
    (await queryUtil.terms((query) => {
      query.withObjectIds([post.ID]);
    })) ?? [];

  let ok = false;

  terms.forEach((term) => {
    if (term.slug === testSlug) {
      ok = true;
    }
  });

  expect(ok).toBe(true);

  // Delete slug
  await termTrx.syncObject(post.ID, [], "category");

  terms =
    (await queryUtil.terms((query) => {
      query.withObjectIds([post.ID]);
    })) ?? [];

  terms.forEach((term) => {
    if (term.slug === testSlug) {
      // This isn't expected
      ok = false;
    }
  });

  expect(ok).toBe(true);
});

test("sync post tags", async () => {
  const context = await Application.getContext("single");
  const termTrx = context.components.get(TermTrx);
  const taxonomyUtil = context.components.get(TaxonomyUtil);
  const queryUtil = context.components.get(QueryUtil);

  const postTags = [
    `sync tag ${Math.floor(Math.random() * 10000)}`,
    `sync tag ${Math.floor(Math.random() * 10000)}`,
  ];

  const post = ((await queryUtil.posts((query) => {
    query
      .where("ID", 2, ">")
      .where("post_status", "publish")
      .where("post_type", "post")
      .builder.limit(1);
  })) ?? [])[0];

  if (!post) throw new Error("post not found");

  await termTrx.syncObject(post.ID, postTags, "post_tag");

  const terms =
    (await queryUtil.terms((query) => {
      query.where("taxonomy", "post_tag").whereIn("name", postTags);
    })) ?? [];

  expect(
    terms.filter((term) => term.name == postTags[0]).length > 0
  ).toBeTruthy();

  const taxonomyPostTags = await taxonomyUtil.get("post_tag");
  await termTrx.removeObject(post.ID, [postTags[0]], taxonomyPostTags);

  const termsAfterOneTermRemoved =
    (await queryUtil.terms((query) => {
      query.withObjectIds([post.ID]);
    })) ?? [];

  expect(termsAfterOneTermRemoved.length).toBe(1);

  // Append term and check if it's appended correctly with term_order
  const appendTag = `append sync tag ${Math.floor(Math.random() * 10000)}`;
  await termTrx.syncObject(post.ID, [appendTag], "post_tag", true);

  const appendTerms =
    (await queryUtil.terms((query) => {
      query.withObjectIds([post.ID]);
    })) ?? []; //.filter((term) => term.name === appendTag);

  // Check if term_order is correctly re-ordered
  for (let i = 0; i < appendTerms.length; i++) {
    expect(appendTerms[i].term_order).toBe(i);
  }
});
