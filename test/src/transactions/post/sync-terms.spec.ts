import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { PostTrx } from "@rnaga/wp-node/transactions";

test("sync categories", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);

  const postTrx = context.components.get(PostTrx);

  const newSlugs = [
    `__test__sync_post_term1__${Math.floor(Math.random() * 1000)}`,
    `__test__sync_post_term1__${Math.floor(Math.random() * 1000)}`,
  ];

  const posts = await queryUtil.posts((query) => {
    query
      .where("post_status", "publish")
      .where("post_type", "post")
      .builder.limit(2);
  });

  if (!posts) throw new Error("post not found");

  const postId = posts[0].ID;
  console.log(`postID to sync categories - ${postId}`);

  // Sync categories
  await postTrx.syncCategories(postId, newSlugs);

  let terms = (
    (await queryUtil.terms((query) => {
      query.withObjectIds([postId]).where("taxonomy", "category");
    })) ?? []
  ).filter((v) => newSlugs.includes(v.slug));

  expect(terms.length).toEqual(newSlugs.length);

  const postId2 = posts[1].ID;

  // Sync tags
  await postTrx.syncTerms(postId2, newSlugs, "post_tag");

  terms = (
    (await queryUtil.terms((query) => {
      query.withObjectIds([postId2]).where("taxonomy", "post_tag");
    })) ?? []
  ).filter((v) => newSlugs.includes(v.slug));

  expect(terms.length).toEqual(newSlugs.length);
});
