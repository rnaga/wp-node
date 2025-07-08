import Application from "@rnaga/wp-node/application";
import { CommentCrud } from "@rnaga/wp-node/crud/comment.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("single");
  const commentCrud = context.components.get(CommentCrud);
  const postTrx = context.components.get(PostTrx);

  const { admin, subscriber } = await getTestUsers(context);

  const random = Math.floor(Math.random() * 10000);
  const postId = await postTrx.upsert({
    post_author: admin.props?.ID,
    post_title: `__comment_crud_update_${random}`,
    post_content: `__comment_crud_update_${random}`,
    post_excerpt: `__comment_crud_update_${random}`,
    post_status: "publish",
  });

  await context.current.assumeUser(admin);

  const result = await commentCrud.create({
    user_id: admin.props?.ID,
    comment_content: "comment",
    comment_post_ID: postId,
    comment_type: "comment",
  });

  const comment = (await commentCrud.getAsUpsert(result.data)).data;

  await context.current.assumeUser(subscriber);

  // Subcriber can't update comment
  await expect(
    commentCrud.update(result.data, {
      ...comment,
      comment_content: "updated",
    })
  ).rejects.toThrow();

  await context.current.assumeUser(admin);

  // Invalid post
  await expect(
    commentCrud.update(result.data, {
      ...comment,
      comment_post_ID: -10,
    })
  ).rejects.toThrow();

  // Change coment type
  await expect(
    commentCrud.update(result.data, {
      ...comment,
      comment_type: "pingback",
    })
  ).rejects.toThrow();

  const newCommentContent = "updated";
  await commentCrud.update(result.data, {
    ...comment,
    comment_content: newCommentContent,
  });

  const updatedComment = (await commentCrud.getAsUpsert(result.data)).data;
  expect(updatedComment.comment_content).toBe(newCommentContent);
});
