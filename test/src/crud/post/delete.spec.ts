import Application from "@rnaga/wp-node/application";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("delete", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);
  const postCrud = context.components.get(PostCrud);

  const { editor, contributor } = await getTestUsers(context);

  const postId = await postTrx.upsert({
    post_author: editor.props?.ID,
    post_title: "test crud post",
    post_name: "test",
    post_type: "post",
  });

  await context.current.assumeUser(contributor);

  await expect(postCrud.delete(postId)).rejects.toThrow();

  await context.current.assumeUser(editor);
  const result = await postCrud.delete(postId);

  expect(result.data).toBe(true);
});
