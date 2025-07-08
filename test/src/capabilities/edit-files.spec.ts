import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite } from "./helpers";

test("edit_files", async () => {
  const { users, cap, config } = await runSite("multi");

  let results = await cap.check("edit_files", users.superAdmin);
  expect(results).toEqual([DO_NOT_ALLOW]);

  config.set({
    constants: {
      ...config.config.constants,
      DISALLOW_FILE_EDIT: false,
    },
  });

  results = await cap.check("edit_files", users.superAdmin);
  expect(results).toEqual(["edit_files"]);

  results = await cap.check("edit_files", users.admin);
  expect(results).toEqual([DO_NOT_ALLOW]);
});
