import Application from "@rnaga/wp-node/application";
import { currentUnixTimestamp } from "@rnaga/wp-node/common";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import {
  CommentTrx,
  PostTrx,
  RevisionTrx,
} from "@rnaga/wp-node/transactions";

test("remove", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const queryUtil = context.components.get(QueryUtil);

  const postTrx = context.components.get(PostTrx);
  const commentTrx = context.components.get(CommentTrx);
  const revisionTrx = context.components.get(RevisionTrx);

  // Add post
  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "test remove",
    post_name: "test",
    post_content: "____remove__test__",
    post_type: "post",
    post_categeory: [1, 2, 3, 4],
    tags_input: ["tag1", "tag2"],
  });

  // Add page
  const pageId = await postTrx.upsert({
    post_author: 1,
    post_title: "test remove page",
    post_name: "test",
    post_content: "____remove__test_page_",
    post_type: "page",
    // These meta data should be deleted
    meta_input: {
      _wp_trash_meta_status: 0,
      _wp_trash_meta_time: currentUnixTimestamp(),
      custom_meta: "__meta__",
    },
  });

  // Add attachment
  const attachmentId = await postTrx.insertAttachment(
    {
      post_author: 1,
      post_title: "test remove",
      post_name: "test remove",
    },
    {
      file: "1/2/3/image.jpg",
      parentPostId: pageId,
    }
  );

  console.log(
    await queryUtil.posts((query) => query.where("ID", attachmentId))
  );

  // Add comment
  const commentId = await commentTrx.upsert({
    comment_post_ID: pageId,
    comment_author_email: "test-remove-post-comments@test.com",
    comment_approved: "approve",
    comment_content: "__comment_remove_post__",
  });

  // Add children
  const childId = await postTrx.upsert({
    post_author: 1,
    post_parent: pageId,
    post_title: "test remove child",
    post_name: "test child",
    post_type: "page",
    post_content: "____remove__test_child_",
  });

  const grandChildId = await postTrx.upsert({
    post_author: 1,
    post_parent: childId,
    post_title: "test remove grand child",
    post_name: "test grand child",
    post_type: "page",
    post_content: "____remove__test_grand_child_",
  });

  // Add revision
  const revisionId = (await revisionTrx.save(pageId)) as number;

  // Remove post
  await postTrx.remove(postId);

  // Check post removed
  expect(await queryUtil.posts((query) => query.where("ID", postId))).toBe(
    undefined
  );

  // Check terms are removed
  const terms = await queryUtil.terms((query) => {
    query.withObjectIds([postId]);
  });
  expect(terms).toBe(undefined);

  // Remove page
  await postTrx.remove(pageId);

  // Check pages are removed
  expect(await queryUtil.posts((query) => query.where("ID", pageId))).toBe(
    undefined
  );
  expect(await queryUtil.posts((query) => query.where("ID", revisionId))).toBe(
    undefined
  );

  // Check postmeta
  expect(await queryUtil.meta("post", (query) => query.withIds([pageId]))).toBe(
    undefined
  );

  // Check comment
  expect(
    await queryUtil.comments((query) => query.where("ID", commentId))
  ).toBe(undefined);

  // Check parents
  let parentId = ((await queryUtil.posts((query) =>
    query.where("ID", childId)
  )) ?? [])[0]?.post_parent;
  expect(parentId).toBe(0);

  parentId = ((await queryUtil.posts((query) =>
    query.where("ID", grandChildId)
  )) ?? [])[0]?.post_parent;
  expect(parentId).toBe(childId);

  parentId = ((await queryUtil.posts((query) =>
    query.where("ID", attachmentId)
  )) ?? [])[0]?.post_parent;
  expect(parentId).toBe(0);

  console.log(
    `postId: ${postId}, pageId: ${pageId} attchment: ${attachmentId} childId: ${childId} grandChild: ${grandChildId}`
  );
});
