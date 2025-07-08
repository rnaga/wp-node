import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { CommentTrx, PostTrx } from "@rnaga/wp-node/transactions";

test("trash and untrash", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const postUtil = context.components.get(PostUtil);
  const postTrx = context.components.get(PostTrx);
  const commentTrx = context.components.get(CommentTrx);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "test title",
    post_name: "test",
    post_type: "post",
    post_status: "publish",
  });

  // Add comment
  const commentId = await commentTrx.upsert({
    comment_post_ID: postId,
    comment_author_email: "test-trash-post-comments@test.com",
    comment_approved: "approve",
    comment_content: "__comment_trash_post__",
  });

  await postTrx.trash(postId);

  let post = await postUtil.get(postId);
  let metas = await post.meta.props();
  expect(post.props?.post_status).toBe("trash");

  // Check if the post name ends with the trashed suffix - __trashed
  expect(
    post.props?.post_name.endsWith(
      context.config.config.constants.TRASHED_SUFFIX_TO_POST_NAME_FOR_POST
    )
  ).toBe(true);

  expect(metas._wp_trash_meta_status).toBe("publish");
  expect(metas._wp_trash_meta_comments_status[commentId]).toBe("1");

  await postTrx.untrash(postId);

  post = await postUtil.get(postId);
  metas = await post.meta.props();

  expect(
    post.props?.post_name.endsWith(
      context.config.config.constants.TRASHED_SUFFIX_TO_POST_NAME_FOR_POST
    )
  ).toBe(false);

  expect(typeof metas._wp_trash_meta_status).toBe("undefined");
  expect(typeof metas._wp_trash_meta_comments_status).toBe("undefined");

  expect(post.props?.post_status).not.toBe("trash");
});
