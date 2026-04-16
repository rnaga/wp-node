import Application from "@rnaga/wp-node/application";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("update preserves JSON in post_content when skipUnslashFields is set", async () => {
  const context = await Application.getContext("single");
  const postCrud = context.components.get(PostCrud);
  const postTrx = context.components.get(PostTrx);
  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const postId = await postTrx.upsert({
    post_author: admin.props?.ID,
    post_title: "crud update skip-unslash test",
    post_type: "post",
  });

  const json = JSON.stringify({ format: "YYYY-MM-DD", value: 'say "hello"' });

  const currentData = (await postCrud.getAsUpsert(postId)).data;

  await postCrud.update(
    postId,
    { ...structuredClone(currentData), post_content: json },
    { skipUnslashFields: ["post_content"] }
  );

  const post = (await postCrud.get(postId, { context: "edit" })).data;
  expect(post.post_content).toBe(json);
  expect(() => JSON.parse(post.post_content)).not.toThrow();
});
