import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TaxonomyUtil } from "@rnaga/wp-node/core/utils/taxonomy.util";
import Database from "@rnaga/wp-node/database";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";
import * as val from "@rnaga/wp-node/validators";

test("update post count", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const termTrx = context.components.get(TermTrx);
  const taxonomyUtil = context.components.get(TaxonomyUtil);
  const database = context.components.get(Database);

  const taxonomy = await taxonomyUtil.get("category");
  const postId = 1;

  // Get term_taxonomy_id not tied to post_id = 1
  const notTermTaxonomyIds: number[] = [];

  (
    (await queryUtil.terms((query) => {
      query.withObjectIds([postId]).where("taxonomy", taxonomy.name).builder;
    })) as any
  ).forEach((v: any) => {
    notTermTaxonomyIds.push(v.term_taxonomy_id);
  });

  const termTaxonomyId = (
    (await queryUtil.terms((query) => {
      query.where("term_taxonomy_id", notTermTaxonomyIds, "not in");
    })) as any
  )[0].term_taxonomy_id;

  const countBefore = (
    (await queryUtil.terms((query) => {
      query.selectTermTaxonomy
        .where("term_taxonomy_id", termTaxonomyId)
        .builder.limit(1);
    }, z.array(val.database.wpTermTaxonomy))) as any
  )[0].count;

  console.log(`countBefore:`, countBefore);

  // Create a term and term taxonomy
  let trx = await database.transaction;
  const current = context.components.get(Current);

  await trx
    .insert({
      object_id: postId,
      term_taxonomy_id: termTaxonomyId,
    })
    .into(current.tables.get("term_relationships"));

  trx.commit();

  await termTrx.updateCount([termTaxonomyId], taxonomy);

  const countAfter = (
    (await queryUtil.terms((query) => {
      query.selectTermTaxonomy
        .where("term_taxonomy_id", termTaxonomyId)
        .builder.limit(1);
    }, z.array(val.database.wpTermTaxonomy))) as any
  )[0].count;

  trx = await database.transaction;
  await trx
    .table(current.tables.get("term_relationships"))
    .where("term_taxonomy_id", termTaxonomyId)
    .where("object_id", postId)
    .del();

  await trx
    .table(current.tables.get("term_taxonomy"))
    .update({
      count: countBefore,
    })
    .where("term_taxonomy_id", termTaxonomyId);

  await trx.commit();

  expect(countBefore + 1).toEqual(countAfter);
});

test("update attachment count", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const termTrx = context.components.get(TermTrx);
  const taxonomyUtil = context.components.get(TaxonomyUtil);
  const database = context.components.get(Database);

  const taxonomyName = "category";
  const taxonomy = await taxonomyUtil.get("category");

  taxonomy.withProps({ objectType: "attachment:post" });

  // Get term_taxonomy_id not tied to post_id = 1
  const attachment = await queryUtil.posts((query) => {
    query
      .where("post_type", "attachment")
      .where("post_status", "inherit")
      .where("post_parent", "0", ">")
      .builder.limit(1);
  });

  const postId = (attachment as any)[0].ID;

  // Get term_taxonomy_id not tied to post_id = 1
  const termTaxonomyId = (
    (await queryUtil.terms((query) => {
      query.withoutObjectIds([postId]).where("taxonomy", taxonomyName).builder;
    })) as any
  )[0].term_taxonomy_id;

  const countBefore = (
    (await queryUtil.terms((query) => {
      query.selectTermTaxonomy
        .where("term_taxonomy_id", termTaxonomyId)
        .builder.limit(1);
    }, z.array(val.database.wpTermTaxonomy))) as any
  )[0].count;

  console.log(`countBefore:`, countBefore);

  // Create a term and term taxonomy
  let trx = await database.transaction;
  const current = context.components.get(Current);

  await trx
    .insert({
      object_id: postId,
      term_taxonomy_id: termTaxonomyId,
    })
    .into(current.tables.get("term_relationships"));

  trx.commit();

  await termTrx.updateCount([termTaxonomyId], taxonomy);

  const countAfter = (
    (await queryUtil.terms((query) => {
      query.selectTermTaxonomy
        .where("term_taxonomy_id", termTaxonomyId)
        .builder.limit(1);
    }, z.array(val.database.wpTermTaxonomy))) as any
  )[0].count;

  trx = await database.transaction;
  await trx
    .table(current.tables.get("term_relationships"))
    .where("term_taxonomy_id", termTaxonomyId)
    .where("object_id", postId)
    .del();

  await trx
    .table(current.tables.get("term_taxonomy"))
    .update({
      count: countBefore,
    })
    .where("term_taxonomy_id", termTaxonomyId);

  await trx.commit();

  expect(countBefore + 1).toEqual(countAfter);
});

test("update non post count", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const termTrx = context.components.get(TermTrx);
  const taxonomyUtil = context.components.get(TaxonomyUtil);
  const database = context.components.get(Database);

  const taxonomyName = "category";
  const taxonomy = await taxonomyUtil.get("category");
  taxonomy.withProps({ objectType: "__non__post__" });

  const termName = `__test_update_count_nonpost_${Math.floor(
    Math.random() + 2000
  )}`;

  let termId = 0,
    termTaxonomyId = 0;

  // Create a term and term taxonomy
  const trx = await database.transaction;
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
      object_id: 9876,
      term_taxonomy_id: termTaxonomyId,
    })
    .into(current.tables.get("term_relationships"));

  await trx.commit();

  await termTrx.updateCount([termTaxonomyId], taxonomy);

  const count = (
    (await queryUtil.terms((query) => {
      query.selectTermTaxonomy
        .where("term_taxonomy_id", termTaxonomyId)
        .builder.limit(1);
      console.log(query.builder.toString());
    }, z.array(val.database.wpTermTaxonomy))) as any
  )[0].count;

  expect(count).toBe(1);
});
