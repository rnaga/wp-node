import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { CommentTrx, PostTrx } from "@rnaga/wp-node/transactions";

test("trachComments and untrashComments", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const queryUtil = context.components.get(QueryUtil);

  const postTrx = context.components.get(PostTrx);
  const commentTrx = context.components.get(CommentTrx);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "test trash comments",
    post_name: "test",
  });

  await commentTrx.upsert({
    comment_post_ID: postId,
    comment_author_email: "test-tash-post-comments@test.com",
    comment_approved: "approve",
    comment_content: "__comment__",
  });

  await postTrx.trashComments(postId);

  let comments = await queryUtil.comments((query) => {
    query.where("post_ID", postId);
  });

  expect((comments as any)[0].comment_approved).toBe("post-trashed");

  const postUtil = context.components.get(PostUtil);
  let post = await postUtil.get(postId);
  let metas = await post.meta.props();

  expect(typeof metas._wp_trash_meta_comments_status).toBe("object");

  // untrash
  await postTrx.untrashComments(postId);

  comments = await queryUtil.comments((query) => {
    query.where("post_ID", postId);
  });

  expect((comments as any)[0].comment_approved).not.toBe("post-trashed");

  post = await postUtil.get(postId);
  metas = await post.meta.props();

  expect(typeof metas._wp_trash_meta_comments_status).toBe("undefined");
});
