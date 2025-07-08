import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite, getPost } from "./helpers";

test("publish_post", async () => {
  const { users, context, cap } = await runSite("multi");

  let results = await cap.check("publish_post", users.admin);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  results = await cap.check("publish_post", users.admin, -1);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  const post = await getPost({
    context,
    user: users.admin,
    postType: "post",
  });
  results = await cap.check("publish_post", users.admin, post?.ID);
  expect(results).toEqual(["publish_posts"]);
});
