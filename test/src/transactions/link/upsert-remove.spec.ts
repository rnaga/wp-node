import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { LinkTrx } from "@rnaga/wp-node/transactions/link.trx";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";
import * as val from "@rnaga/wp-node/validators";

test("defaults", async () => {
  const defaults = val.trx.linkUpsert.parse({
    link_url: "http://localhost",
    link_name: "bookmark",
  });
  expect(defaults).not.toBe(undefined);
});

test("upsert", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);
  const termTrx = context.components.get(TermTrx);
  const linkTrx = context.components.get(LinkTrx);

  const random = Math.floor(Math.random() * 10000);

  const termResult = await termTrx.insert(
    `link_category_upsert_${random}`,
    "link_category"
  );

  const linkId = await linkTrx.upsert({
    link_url: `http://localhost${random}`,
    link_name: `name_${random}`,
    link_notes: "_note_",
    link_category: [termResult.term_id],
    link_target: "_top",
    link_visible: "Y",
  });

  expect(linkId > 0).toBe(true);

  console.log(`linkId: ${linkId}`);

  await linkTrx.upsert({
    link_id: linkId,
    link_name: `name_updated_${random}`,
  });

  let link = await queryUtil.common(
    "links",
    (query) => {
      query.where("link_id", linkId).builder.first();
    },
    val.database.wpLinks
  );

  if (!link) {
    expect(false).toBe(true);
  } else {
    expect(link.link_name).toBe(`name_updated_${random}`);
    expect(link.link_url).toBe(`http://localhost${random}`);
    expect(link.link_target).toBe("_top");
    expect(link.link_visible).toBe("Y");
  }

  await linkTrx.remove(linkId);

  link = await queryUtil.common(
    "links",
    (query) => {
      query.where("link_id", linkId).builder.first();
    },
    val.database.wpLinks
  );

  expect(link).toBe(undefined);

  const linkTerms = await queryUtil.terms((query) => {
    query.where("taxonomy", "link_category").withObjectIds([linkId]);
  });

  expect(linkTerms).toBe(undefined);
});
