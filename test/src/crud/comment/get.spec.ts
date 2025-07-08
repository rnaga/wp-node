import Application from "@rnaga/wp-node/application";
import { CommentCrud } from "@rnaga/wp-node/crud/comment.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("single");
  const commentCrud = context.components.get(CommentCrud);

  const { admin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const comment = await commentCrud.get(1, { context: "edit" });
  expect(comment.data.comment_ID).toBe(1);

  await context.current.assumeUser(subscriber);

  await expect(commentCrud.get(1, { context: "edit" })).rejects.toThrow();

  const comment2 = await commentCrud.get(1);
  expect(comment2.data.comment_ID).toBe(1);
});
