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
