import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { Options } from "@rnaga/wp-node/core/options";
import { runSite } from "./helpers";

test("edit_term", async () => {
  const { users, cap, context } = await runSite("multi");

  let results = await cap.check("edit_term", users.subscriber);
  expect(results).toEqual([DO_NOT_ALLOW]);

  results = await cap.check("edit_term", users.subscriber, -1);
  expect(results).toEqual([DO_NOT_ALLOW]);

  const defaultCategoryId = await context.components
    .get(Options)
    .get("default_category");

  results = await cap.check("delete_term", users.subscriber, defaultCategoryId);
  expect(results).toEqual([DO_NOT_ALLOW]);

  results = await cap.check("edit_term", users.subscriber, defaultCategoryId);
  expect(results).toEqual(["manage_categories"]);
});

test("manage_terms", async () => {
  const { users, cap } = await runSite("multi");

  let results = await cap.check("manage_terms", users.superAdmin);
  expect(results.includes("manage_categories")).toBe(true);

  results = await cap.check("assign_terms", users.superAdmin);
  expect(results.includes("manage_categories")).toBe(true);

  results = await cap.check("edit_terms", users.superAdmin);
  expect(results.includes("manage_categories")).toBe(true);

  results = await cap.check("delete_terms", users.superAdmin);
  expect(results.includes("manage_categories")).toBe(true);
});
