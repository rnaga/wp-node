import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite } from "./helpers";

test("upload_themes | upload_plugins", async () => {
  const { users, cap } = await runSite("multi");

  let results = await cap.check("update_themes", users.subscriber);
  expect(results).toEqual([DO_NOT_ALLOW]);

  results = await cap.check("upload_themes", users.superAdmin);
  expect(results).toEqual(["install_themes"]);

  results = await cap.check("upload_plugins", users.superAdmin);
  expect(results).toEqual(["install_plugins"]);

  results = await cap.check("update_core", users.superAdmin);
  expect(results).toEqual(["update_core"]);
});
