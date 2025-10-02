import Application from "@rnaga/wp-node/application";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("copy", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);
  const postCrud = context.components.get(PostCrud);

  const { editor, admin } = await getTestUsers(context);

  await context.current.assumeUser(editor);

  const postId = await postTrx.upsert({
    post_author: editor.props?.ID,
    post_title: `test copy ${Math.floor(Math.random() * 100000)}`,
    post_name: "test",
    post_type: "post",
    meta_input: {
      meta_key1: "meta_value1",
      meta_key2: "meta_value2",
    },
    post_category: [1],
    tags_input: ["tag1", "tag2"],
  });

  await context.current.assumeUser(admin);

  const copiedPostId = (await postCrud.copy(postId)).data;
  const copiedPost = (await postCrud.get(copiedPostId)).data;

  expect(copiedPost?.ID).not.toBe(postId);
  expect(copiedPost?.post_author).toBe(admin.props?.ID);
  expect(copiedPost?.post_title).toContain("Copy of");

  // Copy another post with the same title
  const copiedPostId2 = (await postCrud.copy(postId)).data;
  const copiedPost2 = (await postCrud.get(copiedPostId2)).data;

  console.log(copiedPost2?.ID, copiedPost?.ID, copiedPost, copiedPost2);

  expect(copiedPost2?.ID).not.toBe(postId);
  expect(copiedPost2?.ID).not.toBe(copiedPost?.ID);
});
