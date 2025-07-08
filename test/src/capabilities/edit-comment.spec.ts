import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite } from "./helpers";

test("edit_comment", async () => {
  const { users, cap } = await runSite("multi");

  let results = await cap.check("edit_comment", users.userCommentIDOne);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  results = await cap.check("edit_comment", users.userCommentIDOne, -1);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  results = await cap.check("edit_comment", users.userCommentIDOne, 1);
  expect(results).toEqual(["edit_published_posts"]);

  results = await cap.check("edit_comment", users.subscriber, 1);
  expect(results).toEqual(["edit_others_posts", "edit_published_posts"]);
});
