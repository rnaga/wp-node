import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TermUtil } from "@rnaga/wp-node/core/utils/term.util";

test("get a term", async () => {
  const context = await Application.getContext("single");

  const util = context.components.get(TermUtil);
  const term = await util.get(1);
  expect(term?.props?.term_id).toBe(1);

  expect(term?.taxonomyName).toBe("category");

  const term2 = await util.get(0, "post_tag");
  expect(term2?.taxonomyName).toBe("post_tag");
});

test("unique slug", async () => {
  const context = await Application.getContext("single");

  const util = context.components.get(TermUtil);
  const queryUtil = context.components.get(QueryUtil);

  // When term has parent
  const termsWithParent = await queryUtil.terms((query) => {
    query
      .where("taxonomy", "category")
      .where("parent", "0", ">")
      .builder.limit(1);
  });

  let term = await util.get((termsWithParent as any)[0].term_id);
  let slug = term.props?.slug ?? "";

  let newSlug = await util.getUniqueSlug(slug, term);
  expect(newSlug !== slug && newSlug.length > 0).toBe(true);

  // When term has no parent
  const terms = await queryUtil.terms((query) => {
    query
      .where("taxonomy", "category")
      .where("parent", "0", "=")
      .builder.limit(1);
  });

  // Test against existing term
  term = await util.get((terms as any)[0].term_id);
  slug = term.props?.slug ?? "";

  newSlug = await util.getUniqueSlug(slug, term);
  expect(newSlug).toBe(slug);

  // Test against Non-existing term
  term = await util.get(0, "category");

  // Should end with suffix - e.g. "-2"
  newSlug = await util.getUniqueSlug(slug, term);
  expect(newSlug).toMatch(/-[0-9]$/);
});

// test("toHierachy", async () => {
//   const context = await Application.getContext("multi");
//   const queryUtil = context.components.get(QueryUtil);
//   const termUtil = context.components.get(TermUtil);

//   const terms =
//     (await queryUtil.terms((query) => {
//       query.withChildren("taxonomy", ["category"]).groupBy("term_id");
//       //console.log(query.builder.toString());
//     })) ?? [];

//   const hierarchy = termUtil.toHierarchy(terms);
//   expect(Array.isArray(hierarchy[0].children)).toBe(true);
// });

// test("mapHierachy", async () => {
//   const context = await Application.getContext("multi");
//   const queryUtil = context.components.get(QueryUtil);
//   const termUtil = context.components.get(TermUtil);

//   const terms =
//     (await queryUtil.terms((query) => {
//       query.withChildren("taxonomy", ["category"]).groupBy("term_id");
//       //console.log(query.builder.toString());
//     })) ?? [];

//   const result = termUtil.mapHierarchy(terms, (term, index) => {
//     //console.log(term, index);
//     return index;
//   });
//   expect(result.length).toBe(terms.length);
// });

test("toTerms", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);
  const termUtil = context.components.get(TermUtil);

  const result =
    (await queryUtil.terms((query) => {
      query.where("taxonomy", "category").builder.limit(10);
      //console.log(query.builder.toString());
    })) ?? [];

  const terms = await termUtil.toTerms(result);
  expect(terms[0].props?.term_id).toBe(result[0]?.term_id);
  expect(terms[0].taxonomyName).toBe(result[0]?.taxonomy);
  expect(terms[0].taxonomy?.name).toBe(result[0]?.taxonomy);
});
