import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);
  const postCrud = context.components.get(PostCrud);
  const queryUtil = context.components.get(QueryUtil);

  const { subscriber, contributor, admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);
  let data = (await postCrud.getAsUpsert(1)).data;

  await context.current.assumeUser(subscriber);

  data.post_content = "updated";

  await expect(
    postCrud.update(1, {
      ...structuredClone(data),
      post_content: "updated",
    })
  ).rejects.toThrow();

  const postId = await postTrx.upsert({
    post_author: contributor.props?.ID,
    post_title: "test crud post",
    post_name: "test",
    post_type: "post",
  });

  // Switch user to contributor
  await context.current.assumeUser(contributor);
  data = (await postCrud.getAsUpsert(postId)).data;

  expect(data.post_status).toBe("draft");

  // contributor can't publish post
  await postCrud.update(postId, {
    ...structuredClone(data),
    post_status: "publish",
    meta_input: {
      _protected: "yes", // protected meta should be ignored
    },
  });

  data = (await postCrud.getAsUpsert(postId)).data;
  expect(data.post_status).toBe("pending");
  expect(data?.meta_input?._protected).toBe(undefined);

  // Revision
  await postCrud.update(postId, {
    ...structuredClone(data),
    post_content: "updated",
  });

  const revisions = await queryUtil.posts((query) => {
    query.where("post_parent", postId);
  });

  // Revision should be created
  expect(Array.isArray(revisions)).toBe(true);
});
