import Application from "@rnaga/wp-node/application";
import { CommentUtil } from "@rnaga/wp-node/core/utils/comment.util";
import { CommentCrud } from "@rnaga/wp-node/crud/comment.crud";
import { OptionsTrx, PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("create", async () => {
  const context = await Application.getContext("single");
  const optionsTrx = context.components.get(OptionsTrx);
  const commentCrud = context.components.get(CommentCrud);
  const postTrx = context.components.get(PostTrx);
  const commentUtil = context.components.get(CommentUtil);

  await optionsTrx.insert("comment_registration", 1, {
    upsert: true,
  });

  // not logged in
  await expect(
    commentCrud.create({
      comment_content: "comment",
    })
  ).rejects.toThrow();

  await optionsTrx.insert("comment_registration", 0, {
    upsert: true,
  });

  await optionsTrx.insert("require_name_email", 1, {
    upsert: true,
  });

  // Empty author and email (and user not logged in)
  await expect(
    commentCrud.create({
      comment_author: "",
      comment_author_email: "",
      comment_post_ID: 1,
      comment_content: "comment",
    })
  ).rejects.toThrow();

  await optionsTrx.insert("require_name_email", 0, {
    upsert: true,
  });

  const { subscriber, contributor } = await getTestUsers(context);

  await context.current.assumeUser(subscriber);

  // user id doesn't match
  await expect(
    commentCrud.create({
      user_id: 1,
      comment_content: "comment",
      comment_post_ID: 1,
    })
  ).rejects.toThrow();

  // IP doesnt match
  await expect(
    commentCrud.create(
      {
        comment_content: "comment",
        comment_author_IP: "127.0.0.1",
        comment_post_ID: 1,
      },
      {
        remoteIp: "10.0.0.1",
      }
    )
  ).rejects.toThrow();

  await expect(
    commentCrud.create({
      comment_content: "comment",
      comment_approved: "1",
      comment_post_ID: 1,
    })
  ).rejects.toThrow();

  // post id not specified
  await expect(
    commentCrud.create({
      comment_content: "comment",
      comment_approved: "1",
    })
  ).rejects.toThrow();

  // invalid post
  await expect(
    commentCrud.create({
      comment_content: "comment",
      comment_approved: "1",
      comment_post_ID: 999999999,
    })
  ).rejects.toThrow();

  // can't create against the existing comment
  await expect(
    commentCrud.create({
      comment_content: "comment",
      comment_approved: "1",
      comment_post_ID: 1,
      comment_ID: 1,
    })
  ).rejects.toThrow();

  // invalid comment type
  await expect(
    commentCrud.create({
      comment_content: "comment",
      comment_approved: "1",
      comment_post_ID: 1,
      comment_type: "invalid_type",
    })
  ).rejects.toThrow();

  // empty content
  await expect(
    commentCrud.create({
      comment_content: "",
      comment_approved: "1",
      comment_post_ID: 1,
    })
  ).rejects.toThrow();

  const random = Math.floor(Math.random() * 1000000);
  const postId = await postTrx.upsert({
    post_title: `__comment_crud_create_${random}`,
    post_content: `__comment_crud_create_${random}`,
    post_excerpt: `__comment_crud_create_${random}`,
    post_status: "publish",
  });

  let result = await commentCrud.create({
    comment_content: "comment",
    comment_post_ID: postId,
    comment_type: "comment",
  });

  const comment = await commentUtil.get(result.data);

  expect(comment.props?.comment_author_email).toBe(
    subscriber.props?.user_email
  );
  expect(comment.props?.comment_approved).toBe("1");

  await optionsTrx.insert("comment_moderation", 1, {
    upsert: true,
  });

  result = await commentCrud.create({
    user_id: contributor.props?.ID,
    comment_author_email: contributor.props?.user_email,
    comment_author: contributor.props?.display_name,
    comment_content: "comment",
    comment_post_ID: postId,
    comment_type: "comment",
  });

  await optionsTrx.insert("comment_moderation", 0, {
    upsert: true,
  });

  const comment2 = await commentUtil.get(result.data);
  expect(comment2.props?.comment_approved).toBe("0");
});
