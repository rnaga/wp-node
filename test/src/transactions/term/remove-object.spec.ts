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
  const current = context.components.get(Current);

  const taxonomyName = "category";
  const testId = Date.now() + Math.floor(Math.random() * 10000);
  const termName = `__test_remove_object_${testId}__`;
  const postId = 900000 + testId;

  let termId = 0,
    termTaxonomyId = 0;
  let setupCommitted = false;

  let trx = await database.transaction;
  try {
    await trx
      .insert({
        name: termName,
        slug: termName,
      })
      .into(current.tables.get("terms"))
      .then((v) => {
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
        termTaxonomyId = v[0];
      });

    await trx
      .insert({
        object_id: postId,
        term_taxonomy_id: termTaxonomyId,
      })
      .into(current.tables.get("term_relationships"));

    await trx.commit();
    setupCommitted = true;

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

    expect(termsBefore?.length).toBe(1);
    expect(termsAfter ?? []).toEqual([]);
  } finally {
    if (!setupCommitted) {
      await trx.rollback().catch(() => undefined);
    }

    const cleanupTrx = await database.transaction;

    try {
      if (termTaxonomyId > 0) {
        await cleanupTrx
          .table(current.tables.get("term_relationships"))
          .where("object_id", postId)
          .where("term_taxonomy_id", termTaxonomyId)
          .del();

        await cleanupTrx
          .table(current.tables.get("term_taxonomy"))
          .where("term_taxonomy_id", termTaxonomyId)
          .del();
      }

      if (termId > 0) {
        await cleanupTrx
          .table(current.tables.get("terms"))
          .where("term_id", termId)
          .del();
      }

      await cleanupTrx.commit();
    } catch (error) {
      await cleanupTrx.rollback();
      throw error;
    }
  }
});
