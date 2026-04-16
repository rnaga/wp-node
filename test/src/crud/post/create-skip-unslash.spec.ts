import Application from "@rnaga/wp-node/application";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { getTestUsers } from "../../../helpers";

test("create preserves JSON in post_content when skipUnslashFields is set", async () => {
  const context = await Application.getContext("single");
  const postCrud = context.components.get(PostCrud);
  const { contributor } = await getTestUsers(context);

  await context.current.assumeUser(contributor);

  const json = JSON.stringify({ format: "YYYY-MM-DD", value: 'say "hello"' });

  const result = await postCrud.create(
    {
      post_title: "crud create skip-unslash test",
      post_author: contributor.props?.ID ?? 0,
      post_type: "post",
      post_content: json,
    },
    { skipUnslashFields: ["post_content"] }
  );

  const post = (await postCrud.get(result.data, { context: "edit" })).data;
  expect(post.post_content).toBe(json);
  expect(() => JSON.parse(post.post_content)).not.toThrow();
});
