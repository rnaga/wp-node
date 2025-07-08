import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite } from "./helpers";

test("install_languages", async () => {
  const { users, cap } = await runSite("multi");

  let results = await cap.check("install_languages", users.subscriber);
  expect(results).toEqual([DO_NOT_ALLOW]);

  results = await cap.check("install_languages", users.superAdmin);
  expect(results).toEqual(["install_languages"]);
});
