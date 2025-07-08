import Application from "@rnaga/wp-node/application";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import * as val from "@rnaga/wp-node/validators";
import { getTestUsers } from "../../../helpers";

test("create", async () => {
  const context = await Application.getContext("single");
  const postCrud = context.components.get(PostCrud);

  const { subscriber, contributor } = await getTestUsers(context);

  const data = val.trx.postUpsert.parse({});

  await context.current.assumeUser(subscriber);

  await expect(
    postCrud.create({
      ...structuredClone(data),
    })
  ).rejects.toThrow();

  await context.current.assumeUser(contributor);

  const result = await postCrud.create({
    ...structuredClone(data),
    post_title: "test meta form data",
    post_name: "test",
    post_author: contributor.props?.ID ?? 0,
    post_mime_type: "text/html",
  });

  const post = (await postCrud.get(result.data)).data;
  expect(post?.ID && post.ID > 0).toBe(true);
});
