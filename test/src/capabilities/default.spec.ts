import { runSite } from "./helpers";

test("default", async () => {
  const { users, cap } = await runSite("multi");

  let results = await cap.check("read", users.subscriber);
  expect(results).toEqual(["read"]);

  results = await cap.check("import", users.superAdmin);
  expect(results).toEqual(["import"]);

  results = await cap.check("create_posts", users.superAdmin);
  expect(results).toEqual(["edit_posts"]);
});
