import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { RevisionCrud } from "@rnaga/wp-node/crud/revision.crud";
import { PostTrx, RevisionTrx } from "@rnaga/wp-node/transactions";

test("restore", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  const postUtil = context.components.get(PostUtil);
  const revisionTrx = context.components.get(RevisionTrx);
  const revisionCrud = context.components.get(RevisionCrud);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "__initital_title__",
    post_excerpt: "__initial_excerpt__",
    post_content: "__initial_content__",
  });

  const revisionId1 = (await revisionTrx.save(postId)) as number;

  // Try revision without change
  expect(await revisionTrx.save(postId)).toBe(undefined);

  // Update post to create another revision
  await postTrx.upsert({
    ID: postId,
    post_title: "__updated_title__",
    post_excerpt: "__updated_excerpt__",
    post_content: "___updated____",
  });

  await revisionTrx.save(postId);

  const revision1 = await postUtil.get(revisionId1);
  const result = await revisionCrud.restore(
    postId,
    revision1.props?.ID as number
  );

  expect(result.data).toBe(true);
});
