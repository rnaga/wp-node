import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TaxonomyUtil } from "@rnaga/wp-node/core/utils/taxonomy.util";
import Database from "@rnaga/wp-node/database";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";
import * as val from "@rnaga/wp-node/validators";

test("remove object", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const termTrx = context.components.get(TermTrx);
  const taxonomyUtil = context.components.get(TaxonomyUtil);
  const database = context.components.get(Database);

  const taxonomyName = "category";
  const termName = "__test_remove_object__";

  const postId = 1;
  let termId = 0,
    termTaxonomyId = 0;

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
      object_id: postId,
      term_taxonomy_id: termTaxonomyId,
    })
    .into(current.tables.get("term_relationships"));

  await trx.commit();

  const getTerms = async () => {
    return await queryUtil.terms((query) => {
      query.selectTermRelationships
        .where("object_id", postId)
        .where("terms_relationships.term_taxonomy_id", termTaxonomyId);
    }, z.array(val.database.wpTermRelationships));
  };

  const termsBefore = await getTerms();

  const taxonomy = await taxonomyUtil.get(taxonomyName);
  await termTrx.removeObject(postId, [termName], taxonomy);

  const termsAfter = await getTerms();

  trx = await database.transaction;

  await trx.table(current.tables.get("terms")).where("term_id", termId).del();

  await trx
    .table(current.tables.get("term_taxonomy"))
    .where("term_taxonomy_id", termTaxonomyId)
    .del();

  await trx.commit();

  expect(termsBefore).not.toBe(undefined);
  expect(termsAfter && termsAfter.length).toEqual(0);
});
