import Application from "@rnaga/wp-node/application";
import { CommentTrx } from "@rnaga/wp-node/transactions";
import { CommentUtil } from "@rnaga/wp-node/core/utils/comment.util";

test("trash", async () => {
  const context = await Application.getContext("single");
  const commentUtil = context.components.get(CommentUtil);
  const commentTrx = context.components.get(CommentTrx);

  const commentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author_email: "test@test.com",
    comment_approved: "approve",
    comment_content: "__comment__",
  });

  await commentTrx.trash(commentId);

  const comment = await commentUtil.get(commentId);
  const metas = await comment.meta.props();

  expect(comment.props?.comment_approved).toBe("trash");
  expect(metas._wp_trash_meta_status).toBe(1);
});

test("trash note with children", async () => {
  const context = await Application.getContext("single");
  const commentUtil = context.components.get(CommentUtil);
  const commentTrx = context.components.get(CommentTrx);

  const randomId = Math.floor(Math.random() * 1000000);

  const parentCommentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author_email: `parent${randomId}@test.com`,
    comment_approved: "approve",
    comment_content: "__parent_comment__",
    comment_type: "note",
  });

  const childCommentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author_email: `child${randomId}@test.com`,
    comment_approved: "approve",
    comment_content: "__child_comment__",
    comment_parent: parentCommentId,
  });

  await commentTrx.trash(parentCommentId);

  const parentComment = await commentUtil.get(parentCommentId);
  const parentMetas = await parentComment.meta.props();

  const childComment = await commentUtil.get(childCommentId);
  const childMetas = await childComment.meta.props();

  expect(parentComment.props?.comment_approved).toBe("trash");
  expect(parentMetas._wp_trash_meta_status).toBe(1);

  expect(childComment.props?.comment_approved).toBe("trash");
  expect(childMetas._wp_trash_meta_status).toBe(1);
});

test("trash note with EMPTY_TRASH_DAYS = 0", async () => {
  const context = await Application.getContext("single");
  const commentUtil = context.components.get(CommentUtil);
  const commentTrx = context.components.get(CommentTrx);

  // Set EMPTY_TRASH_DAYS to 0
  context.config.config.constants.EMPTY_TRASH_DAYS = 0;

  const randomId = Math.floor(Math.random() * 1000000);

  const commentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author_email: `parent${randomId}@test.com`,
    comment_approved: "approve",
    comment_content: "__parent_comment__",
    comment_type: "note",
  });

  // Then create child comment
  const childCommentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author_email: `child${randomId}@test.com`,
    comment_approved: "approve",
    comment_content: "__child_comment__",
    comment_parent: commentId,
  });

  await commentTrx.trash(commentId);

  const comment = await commentUtil.get(commentId);
  const childComment = await commentUtil.get(childCommentId);

  expect(comment.props).toBeUndefined();
  expect(childComment.props).toBeUndefined();
});
