import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import Database from "@rnaga/wp-node/database";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";
import * as val from "@rnaga/wp-node/validators";

test("sharedTerm", async () => {
  const context = await Application.getContext("single");
  const database = context.components.get(Database);

  const trxInsert = await database.transaction;
  const trxDelete = await database.transaction;

  // For a splitted term
  let newTermId = 0;

  // A term Id for a child
  let termIdforChild = 0;

  // To assign a term id to split
  let termTaxonomyIdToSplit = 0;

  const queryUtil = context.components.get(QueryUtil);
  const termTrx = context.components.get(TermTrx);

  // Get a term that's about to split
  const terms = await queryUtil.terms((query) => {
    query.where("term_id", 1);
    console.log(query.builder.toString());
  });

  console.log(terms);

  const current = context.components.get(Current);
  const termsName = (terms as any)[0].name;

  // Create a new term taxonomy to split
  await trxInsert
    .insert({
      term_id: 1,
      taxonomy: "__test__",
      description: "__test__", // Will use this to formatting later
    })
    .into(current.tables.get("term_taxonomy"))
    .then((v) => {
      termTaxonomyIdToSplit = v[0];
    });

  await trxInsert
    .insert({
      name: "__test_term__",
      slug: "__test_term__",
    })
    .into(current.tables.get("terms"))
    .then((v) => {
      console.log(`Child: `, v);
      termIdforChild = v[0];
    });

  await trxInsert
    .insert({
      term_id: termIdforChild,
      taxonomy: "__test__",
      description: "__test__child__",
      parent: 1,
    })
    .into(current.tables.get("term_taxonomy"))
    .then((v) => {
      console.log(`Child: `, v);
    });

  await trxInsert.commit();

  console.log(`Here's the term id to split - ${termTaxonomyIdToSplit}`);

  // Call splitSharedTerm to split a term
  await termTrx.splitSharedTerm(1, termTaxonomyIdToSplit);

  // Let's check the new term (it should have a differnt term id rather than 1)
  const splittedTerms = await queryUtil.terms((query) => {
    query.selectTerms
      .where("terms.name", termsName)
      .where("terms.term_id", 1, ">");
    console.log(query.builder.toString());
  }, z.array(val.database.wpTerms));

  console.log("splitted Terms", splittedTerms);

  newTermId = (splittedTerms as any)[0].term_id;
  expect(newTermId !== 1).toEqual(true);

  // Check term taxonomy created for a test
  const termTaxonomies = await queryUtil.terms((query) => {
    query.selectTermTaxonomy.where("taxonomy", "__test__");
  }, z.array(val.database.wpTermTaxonomy));

  console.log("termTaxonomies", termTaxonomies);

  // Clean up before expect
  await trxDelete
    .table(current.tables.get("term_taxonomy"))
    .where("taxonomy", "__test__")
    .del();

  await trxDelete
    .table(current.tables.get("term_taxonomy"))
    .where("taxonomy", "__test_child_")
    .del();

  await trxDelete
    .table(current.tables.get("terms"))
    .where("term_id", newTermId)
    .del();
  await trxDelete
    .table(current.tables.get("terms"))
    .where("term_id", termIdforChild)
    .del();

  await trxDelete.commit();

  if (Array.isArray(termTaxonomies)) {
    for (const termTaxonomy of termTaxonomies) {
      if (termTaxonomy.description == "__test__") {
        expect(termTaxonomy.term_id).toBe(newTermId);
      } else {
        // it's a child term taxonomy
        expect(termTaxonomy.description).toBe("__test__child__");
      }
    }
  }
});
