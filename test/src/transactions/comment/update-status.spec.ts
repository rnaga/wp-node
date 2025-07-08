import Application from "@rnaga/wp-node/application";
import { CommentUtil } from "@rnaga/wp-node/core/utils/comment.util";
import { CommentTrx } from "@rnaga/wp-node/transactions";

test("update count", async () => {
  const context = await Application.getContext("single");
  const commentUtil = context.components.get(CommentUtil);
  const commentTrx = context.components.get(CommentTrx);

  const commentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author_email: "test@test.com",
    comment_approved: "approve",
    comment_content: "__comment__",
  });

  await commentTrx.updateStatus(commentId, "spam");

  const comment = await commentUtil.get(commentId);
  expect(comment.props?.comment_approved).toBe("spam");
});
