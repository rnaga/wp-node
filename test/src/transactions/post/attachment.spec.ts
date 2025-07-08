import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { CommentTrx, PostTrx } from "@rnaga/wp-node/transactions";

test("insert and remove", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const queryUtil = context.components.get(QueryUtil);
  const postUtil = context.components.get(PostUtil);

  const postTrx = context.components.get(PostTrx);
  const commentTrx = context.components.get(CommentTrx);

  const file = "1/2/3/image.jpg";
  const attachmentId = await postTrx.insertAttachment(
    {
      post_author: 1,
      post_title: "test attachment",
      post_name: "test attachment",
      post_categeory: [1, 2, 3],
      tags_input: ["tag1", "tag2", "tag3", "tag4"],
    },
    {
      file: "1/2/3/image.jpg",
      parentPostId: 1,
    }
  );

  let post = await postUtil.get(attachmentId);
  let metas = await post.meta.props();
  expect(metas._wp_attached_file).toBe(file);

  let terms = await queryUtil.terms((query) => {
    query
      .withObjectIds([attachmentId])
      .whereIn("taxonomy", ["category", "post_tag"]);
  });

  // Add comment
  await commentTrx.upsert({
    comment_post_ID: attachmentId,
    comment_author_email: "test-attachment-post-comments@test.com",
    comment_approved: "approve",
    comment_content: "__comment__",
  });

  await postTrx.removeAttachment(attachmentId);

  post = await postUtil.get(attachmentId);
  metas = await post.meta.props();

  const comments = await queryUtil.comments((query) => {
    query.where("post_ID", attachmentId);
  });

  terms = await queryUtil.terms((query) => {
    query.withObjectIds([attachmentId]);
  });
  console.log(terms);
  expect(post.props).toBe(undefined);
  expect(Object.entries(metas).length).toBe(0);
  expect(comments).toBe(undefined);
});
