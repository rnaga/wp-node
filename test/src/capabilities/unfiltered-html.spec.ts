import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite } from "./helpers";

test("unfiltered_html", async () => {
  const { users, cap, config } = await runSite("multi");

  let results = await cap.check("unfiltered_html", users.superAdmin);
  expect(results).toEqual([DO_NOT_ALLOW]);

  config.set({
    constants: {
      ...config.config.constants,
      DISALLOW_UNFILTERED_HTML: false,
    },
  });

  results = await cap.check("unfiltered_html", users.superAdmin);
  expect(results).toEqual(["unfiltered_html"]);

  results = await cap.check("unfiltered_html", users.admin);
  expect(results).toEqual([DO_NOT_ALLOW]);
});
