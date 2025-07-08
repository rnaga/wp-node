import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite } from "./helpers";

test("unfiltered_upload", async () => {
  const { users, cap, config } = await runSite("multi");

  let results = await cap.check("unfiltered_upload", users.superAdmin);
  expect(results).toEqual([DO_NOT_ALLOW]);

  config.set({
    constants: {
      ...config.config.constants,
      ALLOW_UNFILTERED_UPLOADS: true,
    },
  });

  results = await cap.check("unfiltered_upload", users.superAdmin);
  expect(results).toEqual(["unfiltered_upload"]);

  results = await cap.check("unfiltered_upload", users.admin);
  expect(results).toEqual([DO_NOT_ALLOW]);
});
