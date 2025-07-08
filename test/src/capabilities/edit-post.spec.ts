import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { runSite, getPost } from "./helpers";

test("edit_post | edit_page", async () => {
  const { users, context, cap } = await runSite("multi");

  let results = await cap.check("edit_post", users.admin);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  results = await cap.check("edit_post", users.admin, -1);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  let post = await getPost({
    context,
    user: users.admin,
    postType: "revision",
  });
  results = await cap.check("delete_post", users.admin, post?.ID);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  // If the post author is set and the user is the author...
  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "publish",
  });

  results = await cap.check("edit_post", users.editor, post?.ID);
  expect(results[0]).toBe("edit_published_posts");

  // Editing a page
  post = await getPost({
    context,
    user: users.editor,
    postType: "page",
    postStatus: "future",
  });

  results = await cap.check("edit_post", users.editor, post?.ID);
  expect(results[0]).toBe("edit_published_pages");

  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "trash",
  });
  results = await cap.check("edit_post", users.editor, post?.ID);
  expect(results[0]).toBe("edit_posts");

  post = await getPost({
    context,
    user: users.editor,
    postType: "page",
    postStatus: "draft",
  });
  results = await cap.check("edit_post", users.editor, post?.ID);
  expect(results[0]).toBe("edit_pages");

  // The user is trying to edit someone else's post.
  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "publish",
  });
  results = await cap.check("edit_post", users.admin, post?.ID);
  expect(results).toEqual(["edit_others_posts", "edit_published_posts"]);

  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "private",
  });
  results = await cap.check("edit_post", users.admin, post?.ID);
  expect(results).toEqual(["edit_others_posts", "edit_private_posts"]);
});
