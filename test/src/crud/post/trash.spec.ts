import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("trash and untrash", async () => {
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

  await expect(postCrud.trash(postId)).rejects.toThrow();

  await context.current.assumeUser(editor);
  await postCrud.trash(postId);

  const postUtil = context.components.get(PostUtil);
  let post = await postUtil.get(postId);

  expect(post.props?.post_status).toBe("trash");

  await postCrud.untrash(postId);

  post = await postUtil.get(postId);

  expect(post.props?.post_status).not.toBe("trash");
});
