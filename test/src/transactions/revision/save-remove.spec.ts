import Application from "@rnaga/wp-node/application";
import { Config } from "@rnaga/wp-node/config";
import { MetaUtil } from "@rnaga/wp-node/core/utils/meta.util";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import * as defaults from "@rnaga/wp-node/defaults";
import { PostTrx, RevisionTrx } from "@rnaga/wp-node/transactions";

test("save and remove", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  const revisionTrx = context.components.get(RevisionTrx);
  const postUtil = context.components.get(PostUtil);
  const config = context.components.get(Config);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "test revision save",
    post_name: "test",
    post_content: defaults.seeder.content.firstPage,
    meta_input: {
      meta_key: "meta_value",
      __private_meta_key: "private_meta_value",
    },
  });

  const revisionId1 = (await revisionTrx.save(postId)) as number;

  expect(typeof revisionId1 == "number").toBe(true);

  // Check if meta is saved
  const revision1 = await postUtil.get(revisionId1);
  const metas1 = await revision1.meta.props();
  expect(metas1["meta_key"]).toBe("meta_value");
  expect(metas1["__private_meta_key"]).toBe(undefined);

  // Try revision without change
  expect(await revisionTrx.save(postId)).toBe(undefined);

  // Update post to create another revision
  await postTrx.upsert({
    ID: postId,
    post_content: "___updated____",
  });

  const revisionId2 = (await revisionTrx.save(postId)) as number;
  expect(revisionId2).not.toBe(revisionId1);

  // Change number of revisions to keep, check if old reivison is deleted
  config.config.constants.WP_POST_REVISIONS = 2;

  await postTrx.upsert({
    ID: postId,
    post_content: "___updated__2__",
  });

  const revisionId3 = (await revisionTrx.save(postId)) as number;
  expect(revisionId3).not.toBe(revisionId2);

  // The first revision is now deleted
  // This implies to test remove method
  const post = await postUtil.get(revisionId1);
  expect(post.props).toBe(undefined);

  // Check if meta is deleted
  const metaUtil = context.components.get(MetaUtil);
  const meta = await metaUtil.getValue("post", revisionId1, "meta_key");

  expect(meta).toBe(undefined);
});
