import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { CommentTrx } from "@rnaga/wp-node/transactions";

test("update count", async () => {
  const context = await Application.getContext("single");
  const commentTrx = context.components.get(CommentTrx);

  const count = 10;
  const postId = 1;

  await commentTrx.updateCount(postId, count);

  const post = await context.components.get(PostUtil).get(1);
  expect(post.props?.comment_count).toBe(count);
});
