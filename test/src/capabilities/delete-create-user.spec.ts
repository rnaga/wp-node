import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { Options } from "@rnaga/wp-node/core/options";
import { MetaTrx } from "@rnaga/wp-node/transactions";
import { runSite } from "./helpers";

test("delete_user", async () => {
  const { users, cap } = await runSite("multi");

  let results = await cap.check("delete_users", users.subscriber);
  expect(results).toEqual([DO_NOT_ALLOW]);

  results = await cap.check("delete_users", users.superAdmin);
  expect(results).toEqual(["delete_users"]);

  results = await cap.check(
    "delete_user",
    users.superAdmin,
    users.admin.props?.ID
  );

  expect(results.includes("delete_users")).toBe(true);
});

test("create_users", async () => {
  const { users, cap, context } = await runSite("multi");

  let results = await cap.check("create_users", users.subscriber);

  expect(results).toEqual([DO_NOT_ALLOW]);

  results = await cap.check("create_users", users.superAdmin);
  expect(results).toEqual(["create_users"]);

  const options = context.components.get(Options);
  const metaTrx = context.components.get(MetaTrx);
  const siteId = context.current.siteId;

  const optionsValue = await options.get("add_new_users", {
    siteId,
  });

  await metaTrx.upsert("site", siteId, "add_new_users", "1");

  results = await cap.check("create_users", users.admin, [siteId]);
  expect(results).not.toContain(DO_NOT_ALLOW);

  await metaTrx.upsert("site", siteId, "add_new_users", "0");
  results = await cap.check("create_users", users.admin, [siteId]);
  expect(results).toContain(DO_NOT_ALLOW);

  await metaTrx.upsert("site", siteId, "add_new_users", optionsValue);
});
