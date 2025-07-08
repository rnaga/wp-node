import Application from "@rnaga/wp-node/application";
import { CommentCrud } from "@rnaga/wp-node/crud/comment.crud";
import { CommentTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("list", async () => {
  const context = await Application.getContext("single");
  const commentCrud = context.components.get(CommentCrud);
  const commentTrx = context.components.get(CommentTrx);

  const { admin, subscriber } = await getTestUsers(context);

  for (const user of [admin, subscriber]) {
    for (let i = 0; i < 5; i++) {
      await commentTrx.upsert({
        comment_post_ID: 1,
        user_id: user.props?.ID,
        comment_content: `comment - ${Math.floor(Math.random() * 10000)}`,
      });
    }
  }

  await context.current.assumeUser(subscriber);

  await expect(commentCrud.list({}, { context: "edit" })).rejects.toThrow(
    "Error: Sorry, you are not allowed to edit comments"
  );

  await context.current.assumeUser(admin);

  const comments = await commentCrud.list(
    {
      after: "2020-01-01",
      exclude: [1],
      per_page: 50,
      //parent: [1, 2, 3, 4, 5, 6],
      order: "desc",
      orderby: "comment_ID",
    }
    // { context: "edit" }
  );

  expect(comments.data.length > 0).toBe(true);
});
