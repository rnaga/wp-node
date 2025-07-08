import { runSite } from "./helpers";

test("activate_plugins", async () => {
  const { users, cap } = await runSite("multi");

  let results = await cap.check("activate_plugins", users.subscriber);
  expect(results).toEqual(["activate_plugins"]);

  results = await cap.check("activate_plugins", users.superAdmin);
  expect(results).toEqual(["activate_plugins"]);
});
