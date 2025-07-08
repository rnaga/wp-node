import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite, getPost } from "./helpers";

test("read_post | read_page", async () => {
  const { users, context, cap } = await runSite("multi");

  let results = await cap.check("read_post", users.admin);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  results = await cap.check("read_post", users.admin, -1);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  let post = await getPost({
    context,
    user: users.admin,
    postType: "revision",
  });
  results = await cap.check("read_post", users.admin, post?.ID);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "publish",
  });
  results = await cap.check("read_post", users.editor, post?.ID);
  expect(results).toEqual(["read"]);

  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "private",
  });
  results = await cap.check("read_post", users.admin, post?.ID);
  expect(results).toEqual(["read_private_posts"]);

  // post that's not public and post not tied to user
  post = await getPost({
    context,
    user: users.admin,
    postType: "post",
    postStatus: "draft",
  });
  results = await cap.check("read_post", users.editor, post?.ID);
  expect(results).toEqual(["edit_others_posts"]);
});
