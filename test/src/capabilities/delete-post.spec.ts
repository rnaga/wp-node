import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { getPost, runSite } from "./helpers";

test("delete_post | delete_page", async () => {
  const { users, context, cap } = await runSite("multi");

  let results = await cap.check("delete_post", users.admin);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  results = await cap.check("delete_post", users.admin, -1);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  let post = await getPost({
    context,
    user: users.admin,
    postType: "revision",
  });
  results = await cap.check("delete_post", users.admin, post?.ID);
  expect(results[0]).toBe(DO_NOT_ALLOW);

  /**
   * skipped
   * - if ( ! $post_type ) {
   * - if ( ( get_option( 'page_for_posts' ) == $post->ID ) || ( get_option( 'page_on_front' ) == $post->ID ) ) {
   * - if ( ! $post_type->map_meta_cap ) {
   */

  // If the post author is set and the user is the author...
  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "publish",
  });

  results = await cap.check("delete_post", users.editor, post?.ID);
  expect(results[0]).toBe("delete_published_posts");

  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "future",
  });

  results = await cap.check("delete_post", users.editor, post?.ID);
  expect(results[0]).toBe("delete_published_posts");

  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "trash",
  });
  results = await cap.check("delete_post", users.editor, post?.ID);
  expect(results[0]).toBe("delete_posts");

  post = await getPost({
    context,
    user: users.editor,
    postType: "page",
    postStatus: "trash",
  });
  results = await cap.check("delete_post", users.editor, post?.ID);
  expect(results[0]).toBe("delete_pages");

  post = await getPost({
    context,
    user: users.editor,
    postType: "page",
    postStatus: "draft",
  });
  results = await cap.check("delete_post", users.editor, post?.ID);
  expect(results[0]).toBe("delete_pages");

  // The user is trying to edit someone else's post.
  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "publish",
  });
  results = await cap.check("delete_post", users.admin, post?.ID);
  expect(results).toEqual(["delete_others_posts", "delete_published_posts"]);

  post = await getPost({
    context,
    user: users.editor,
    postType: "post",
    postStatus: "private",
  });
  results = await cap.check("delete_post", users.admin, post?.ID);
  expect(results).toEqual(["delete_others_posts", "delete_private_posts"]);
});
