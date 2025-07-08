import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { PostTrx, RevisionTrx } from "@rnaga/wp-node/transactions";

test("autosave", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  const revisionTrx = context.components.get(RevisionTrx);
  const postUtil = context.components.get(PostUtil);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "__initital_title__",
    post_excerpt: "__initial_excerpt__",
    post_content: "__initial_content__",
    meta_input: {
      meta_key1: "meta_value1",
      meta_key2: "meta_value2",
    },
  });

  const post = await postUtil.get(postId);
  const meta = await post.meta.props();

  const revisionId = await revisionTrx.autosave({
    ...post.props,
    meta_input: meta,
  } as any);

  const revision = await postUtil.get(revisionId as number);
  const revisionMeta = await revision.meta.props();

  expect(revision.props?.post_status).toBe("inherit");
  expect(revision.props?.post_type).toBe("revision");
  expect(revision.props?.post_name).toBe(`${postId}-autosave-v1`);
  expect(revision.props?.post_parent).toBe(postId);
  expect(revisionMeta.meta_key1).toBe("meta_value1");

  // Try autosave without change
  const revisionId1 = await revisionTrx.autosave({
    ...post.props,
    meta_input: meta,
  } as any);
  expect(revisionId1).toBe(revisionId);

  // Try autosave with change
  const revisionId2 = await revisionTrx.autosave({
    ID: postId,
    post_title: "__updated_title__",
    post_excerpt: "__updated_excerpt__",
    post_content: "___updated____",
    meta_input: {
      meta_key1: "meta_value1_updated",
      meta_key2: "meta_value2",
    },
  });

  const revision2 = await postUtil.get(revisionId2 as number);
  expect(revision2.props?.ID).toBe(revision.props?.ID);
  expect(revision2.props?.post_name).toBe(`${postId}-autosave-v1`);
  expect(revision2.props?.post_parent).toBe(postId);
  expect(revision2.props?.post_title).toBe("__updated_title__");
});
