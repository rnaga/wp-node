import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { SiteTrx } from "@rnaga/wp-node/transactions/site.trx";

test("insert", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);

  const siteTrx = context.components.get(SiteTrx);

  // Insert
  const siteId = await siteTrx.insert({
    path: "/test_site_upsert",
    domain: "localhost",
    meta_input: {
      key1: "a",
      key2: "b",
    },
  });

  expect(siteId > 0).toBe(true);
  let site = await queryUtil.sites((query) => {
    query.where("id", siteId);
  });

  expect(site && site.length > 0).toBe(true);

  // Update site
  await siteTrx.insert({
    id: siteId,
    path: "/test_site_upsert_updated",
    domain: "localhost",
  });

  site = await queryUtil.sites((query) => {
    query.where("id", siteId);
  });

  if (!site) {
    expect(false).toBe(true);
  } else {
    expect(site[0].path).toBe("/test_site_upsert_updated");
  }

  // Remove site
  await siteTrx.remove(siteId);

  site = await queryUtil.sites((query) => {
    query.where("id", siteId);
  });

  expect(typeof site === "undefined").toBe(true);
});
