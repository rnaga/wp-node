import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import Database from "@rnaga/wp-node/database";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";

test("update", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const termTrx = context.components.get(TermTrx);
  const database = context.components.get(Database);

  const taxonomyName = "category";
  const termNameAlias = "__test_update_alias__";
  const termName = "__test_update__";

  let termId = 0,
    termIdAlias = 0,
    termTaxonomyId = 0,
    termTaxonomyIdAlias = 0;
  // Create a term and term taxonomy
  let trx = await database.transaction;
  const current = context.components.get(Current);

  await trx
    .insert({
      name: termName,
      slug: termName,
    })
    .into(current.tables.get("terms"))
    .then((v) => {
      console.log("term", v);
      termId = v[0];
    });

  await trx
    .insert({
      name: termNameAlias,
      slug: termNameAlias,
      term_group: -1,
    })
    .into(current.tables.get("terms"))
    .then((v) => {
      console.log("term alias", v);
      termIdAlias = v[0];
    });

  await trx
    .insert({
      term_id: termId,
      taxonomy: taxonomyName,
      description: "test",
      parent: 0,
    })
    .into(current.tables.get("term_taxonomy"))
    .then((v) => {
      console.log("term taxonomy ", v);
      termTaxonomyId = v[0];
    });

  await trx
    .insert({
      term_id: termIdAlias,
      taxonomy: taxonomyName,
      description: "test_alias",
      parent: 0,
    })
    .into(current.tables.get("term_taxonomy"))
    .then((v) => {
      console.log("term taxonomy ", v);
      termTaxonomyIdAlias = v[0];
    });

  await trx.commit();

  // exceptions
  const exceptions: boolean[] = [];

  try {
    exceptions.push(false);
    const existingTerm = await queryUtil.terms((query) => {
      query.where("taxonomy", taxonomyName);
    });

    await termTrx.update(termId, taxonomyName, {
      name: "updating",
      slug: (existingTerm as any)[0].slug,
    });
  } catch (e) {
    // Error: duplicate_term_slug
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  try {
    exceptions.push(false);
    await termTrx.update(termId, taxonomyName, {
      name: "\\",
    });
  } catch (e) {
    // Error: A name is required for this term.
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  try {
    exceptions.push(false);
    await termTrx.update(termId, taxonomyName, {
      name: "updating",
      parentId: 99999999999,
    });
  } catch (e) {
    // Error: Invalid Parent Term
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  try {
    exceptions.push(false);
    await termTrx.update(termId, "__invalid__" as any, {
      name: `updating`,
    });
  } catch (e) {
    // Error: Term Taxonomy not found: taxonomy
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  await termTrx.update(termId, taxonomyName, {
    name: `updated_${termName}`,
    description: "updated_test",
    aliasOf: termNameAlias,
  });

  const terms = await queryUtil.terms((query) => {
    query.where("term_id", termId);
  });

  const termsAlias = await queryUtil.terms((query) => {
    query.where("term_id", termIdAlias);
  });

  console.log(terms, termsAlias);
  trx = await database.transaction;

  await trx.table(current.tables.get("terms")).where("term_id", termId).del();

  await trx
    .table(current.tables.get("term_taxonomy"))
    .where("term_taxonomy_id", termTaxonomyId)
    .del();

  await trx
    .table(current.tables.get("terms"))
    .where("term_id", termIdAlias)
    .del();

  await trx
    .table(current.tables.get("term_taxonomy"))
    .where("term_taxonomy_id", termTaxonomyIdAlias)
    .del();

  await trx.commit();

  expect(terms && terms[0].name).toBe(`updated_${termName}`);
  expect(termsAlias && termsAlias[0].term_group).toEqual(0);
  expect(exceptions.length).toEqual(exceptions.filter(() => true).length);
});
