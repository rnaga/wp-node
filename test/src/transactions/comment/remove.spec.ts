import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { CommentTrx } from "@rnaga/wp-node/transactions";

test("remove", async () => {
  const context = await Application.getContext("single");
  const commentTrx = context.components.get(CommentTrx);
  const queryUtil = context.components.get(QueryUtil);

  const commentIds: number[] = [];
  let commentId = 0;
  for (let i = 0; i <= 2; i++) {
    const data: any = {
      comment_post_ID: 1,
      comment_author_email: `test_${i}@test.com`,
      comment_approved: "approve",
      comment_content: `__comment__${i}`,
    };
    if (commentId > 0) {
      data["comment_parent"] = commentId;
    }
    commentId = await commentTrx.upsert(data);
    commentIds.push(commentId);
  }

  let comments = await queryUtil.comments((query) => {
    query.whereIn("ID", commentIds);
  });

  // Remove the second comment to move children up a level.
  await commentTrx.remove(commentIds[1]);

  comments = await queryUtil.comments((query) => {
    query.whereIn("ID", commentIds);
  });

  // The last comment should be a child of the first comment
  expect((comments as any)[1].comment_parent).toBe(
    (comments as any)[0].comment_ID
  );

  // remove the rest of comments
  for (const commentId of commentIds) {
    await commentTrx.remove(commentId);
  }
});
