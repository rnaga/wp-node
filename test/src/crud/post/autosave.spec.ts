import Application from "@rnaga/wp-node/application";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("autosave", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);
  const postCrud = context.components.get(PostCrud);

  const { subscriber, editor, admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);
  let data = (await postCrud.getAsUpsert(1)).data;

  await context.current.assumeUser(subscriber);

  data.post_content = "autosave";

  // subscriber can't autosave admin's post
  await expect(
    postCrud.autosave(1, {
      ...structuredClone(data),
      post_content: "updated",
    })
  ).rejects.toThrow();

  await context.current.assumeUser(admin);

  const postId = await postTrx.upsert({
    post_author: editor.props?.ID,
    post_title: "test post",
    post_name: "test",
    post_type: "post",
  });

  // Switch user to editor
  await context.current.assumeUser(editor);
  data = (await postCrud.getAsUpsert(postId)).data;

  data.post_title = "autosaved";

  // autosave draft post
  const autosave = (await postCrud.autosave(postId, data)).data;

  // same author and draft status - the same post is used to autosave
  expect(autosave.ID).toBe(postId);

  // Autosave with different user
  await context.current.assumeUser(admin);

  const autosave2 = (await postCrud.autosave(postId, data)).data;
  expect(autosave2.ID).not.toBe(postId);
  expect(autosave2.post_author).toBe(admin.props?.ID);
  expect(autosave2.post_type).toBe("revision");
  expect(autosave2.post_status).toBe("inherit");

  // getAutosave
  const autosaveGet = await postCrud.getAutosave(postId);
  expect(autosaveGet?.data.ID).toBe(autosave2.ID);
});
