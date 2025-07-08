import Application from "@rnaga/wp-node/application";
import { Options } from "@rnaga/wp-node/core/options";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { MetaTrx, PostTrx } from "@rnaga/wp-node/transactions";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";

test("remove", async () => {
  const context = await Application.getContext("single");
  const termTrx = context.components.get(TermTrx);
  const queryUtil = context.components.get(QueryUtil);
  const postTrx = context.components.get(PostTrx);
  const options = context.components.get(Options);

  const random = Math.floor(Math.random() * 100000);

  const parentCategoryId = (
    (await queryUtil.terms((query) => {
      query.where("taxonomy", "category");
    })) as any
  )[0].term_id;

  const categoryName = `__test_term_category_remove_${random}__`;

  const termCategory = await termTrx.insert(categoryName, "category", {
    parentId: parentCategoryId,
  });

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: `__test_term_remove_${random}__`,
    post_excerpt: "__test__",
    post_categeory: [termCategory.term_id],
  });

  // post only has one category, default category should be attched after it gets removed
  await termTrx.remove(termCategory.term_id, "category");

  const defaultCategoryId = (await options.get<number>(
    "default_category"
  )) as number;

  let terms = await queryUtil.terms((query) => {
    query.withObjectIds([postId]).where("taxonomy", "category");
  });

  expect((terms as any)[0].term_id).toBe(defaultCategoryId);

  // Can't delete the default category
  const result = await termTrx.remove(defaultCategoryId, "category");
  expect(result).toBe(false);

  // Test post tag
  const tagName = `__test_term_tag_remove_${random}__`;
  const termTag = await termTrx.insert(tagName, "post_tag");

  // Add meta
  const metaTrx = context.components.get(MetaTrx);
  await metaTrx.upsert("term", termTag.term_id, "_test_", "_value_");

  let meta = await queryUtil.meta("term", (query) => {
    query.withIds([termTag.term_id]);
  });

  console.log(meta);

  await postTrx.upsert({
    ID: postId,
    tags_input: [termTag.term_id],
  });

  // post tag doesn't have detault term
  await termTrx.remove(termTag.term_id, "post_tag");

  terms = await queryUtil.terms((query) => {
    query.withObjectIds([postId]).where("taxonomy", "post_tag");
  });

  expect(terms).toBe(undefined);

  // Meta data should be removed
  meta = await queryUtil.meta("term", (query) => {
    query.withIds([termTag.term_id]);
  });
  expect(meta).toBe(undefined);

  // term taxonomy should be removed
  const deletedTermTaxonomy = await queryUtil.terms((query) => {
    query.selectTermTaxonomy.where(
      "term_taxonomy_id",
      termTag.term_taxonomy_id
    );
  });
  expect(deletedTermTaxonomy).toBe(undefined);

  // term should be removed
  const deletedTerm = await queryUtil.terms((query) => {
    query.selectTerms.where("terms.term_id", termTag.term_id);
  });
  expect(deletedTerm).toBe(undefined);

  // remove post tag with default term
  const defaultTermTag = await termTrx.insert(
    `__test_term_tag_remove_default_${random}__`,
    "post_tag"
  );
  const termTag2 = await termTrx.insert(
    `__test_term_tag_remove_2_${random}__`,
    "post_tag"
  );

  await postTrx.upsert({
    ID: postId,
    tags_input: [termTag2.term_id, `__test_term_tag_remove_3_${random}__`],
  });

  await termTrx.remove(termTag2.term_id, "post_tag", {
    default: defaultTermTag.term_id,
    forceDefault: true,
  });

  terms = await queryUtil.terms((query) => {
    query.withObjectIds([postId]).where("taxonomy", "post_tag");
  });

  // Default post tag should be attached
  expect(
    terms &&
      terms.filter((term) => term.term_id == defaultTermTag.term_id).length > 0
  ).toBe(true);
});
