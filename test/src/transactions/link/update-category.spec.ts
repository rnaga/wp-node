import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import Database from "@rnaga/wp-node/database";
import { TermTrx } from "@rnaga/wp-node/transactions";
import { LinkTrx } from "@rnaga/wp-node/transactions/link.trx";

test("defaults", async () => {
  const context = await Application.getContext("multi");
  const database = context.components.get(Database);
  const linkTrx = context.components.get(LinkTrx);
  const termTrx = context.components.get(TermTrx);
  const queryUtil = context.components.get(QueryUtil);

  const random = Math.floor(Math.random() * 10000);
  const termResult = await termTrx.insert(
    `link_category_${random}`,
    "link_category"
  );

  const trx = await database.transaction;
  let linkId = 0;

  const current = context.components.get(Current);

  await trx
    .insert({
      link_url: "http://localhost",
      link_name: `link_${random}`,
      link_notes: "note",
    })
    .into(current.tables.get("links"))
    .then((v) => {
      console.log("link", v);
      linkId = v[0];
    });
  await trx.commit();

  await linkTrx.updateCategory(linkId, [termResult.term_id]);

  const linkTerms = await queryUtil.terms((query) => {
    query.withObjectIds([linkId]).where("taxonomy", "link_category");
  });

  expect((linkTerms as any)[0].term_id).toBe(termResult.term_id);
});
