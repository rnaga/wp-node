import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite, getPost } from "./helpers";

test("edit_post_meta", async () => {
  const { users, context, cap } = await runSite("multi");

  let results = await cap.check("edit_post_meta", users.admin);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  results = await cap.check("edit_post_meta", users.editor, 1);
  expect(results).toEqual(["edit_others_posts", "edit_published_posts"]);

  // draft post
  let post = await getPost({
    context,
    user: users.admin,
    postType: "post",
    postStatus: "draft",
  });
  results = await cap.check("edit_post_meta", users.admin, post?.ID);
  expect(results).toEqual(["edit_posts"]);

  results = await cap.check(
    "edit_post_meta",
    users.admin,
    post?.ID,
    "_protected"
  );
  expect(results).toEqual(["edit_posts", "edit_post_meta"]);

  results = await cap.check(
    "edit_post_meta",
    users.admin,
    post?.ID,
    "notprotected"
  );
  expect(results).toEqual(["edit_posts"]);

  // published post
  post = await getPost({
    context,
    user: users.admin,
    postType: "post",
    postStatus: "publish",
  });
  results = await cap.check("edit_post_meta", users.admin, post?.ID);
  expect(results).toEqual(["edit_published_posts"]);
});
