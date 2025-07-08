import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { PostTrx } from "@rnaga/wp-node/transactions/post.trx";

test("sync attachment metadata", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);
  const postUtil = context.components.get(PostUtil);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_type: "attachment",
    post_title: "__attachment_test__",
  });

  const json = {
    width: 640,
    height: 480,
    file: "2999/01/WordPress0.jpg",
    filesize: 33193,
  };

  await postTrx.syncAttachmentMetadata(postId, {
    data: json,
  });

  let metadata = await postUtil.getAttachmentMetadata(postId);

  expect(metadata?.file).toBe(json.file);

  await postTrx.syncAttachmentMetadata(postId, {
    remove: true,
  });

  metadata = await postUtil.getAttachmentMetadata(postId);

  expect(metadata).toBe(undefined);
});
