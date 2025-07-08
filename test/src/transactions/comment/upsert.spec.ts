import Application from "@rnaga/wp-node/application";
import { CommentUtil } from "@rnaga/wp-node/core/utils/comment.util";
import { CommentTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";

test("defaults", async () => {
  const defaults = val.trx.commentUpsert.parse({
    comment_content: "comment",
  });
  console.log(defaults);
});

test("upsert", async () => {
  const context = await Application.getContext("single");
  const commentTrx = context.components.get(CommentTrx);

  // Insert
  const commentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author_email: "test@test.com",
    comment_approved: "approve",
    comment_content: "__comment__",
    comment_meta: {
      meta1: 1,
      meta2: "meta2",
    },
  });

  expect(commentId > 0).toBe(true);

  // Update
  await commentTrx.upsert({
    comment_ID: commentId,
    comment_author_email: "test-updated@test.com",
    comment_meta: {
      meta1: 2,
      meta2: "meta3",
    },
  });

  const comment = await context.components.get(CommentUtil).get(commentId);
  const metas = await comment.meta.props();

  expect(comment.props?.comment_ID).toBe(commentId);
  expect(metas.meta1).toBe(2);
});
