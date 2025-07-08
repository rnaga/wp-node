import Application from "@rnaga/wp-node/application";
import { CommentUtil } from "@rnaga/wp-node/core/utils/comment.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import {
  CommentTrx,
  OptionsTrx,
  PostTrx,
} from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";

test("get a comment", async () => {
  const context = await Application.getContext("single");

  const commentUtil = context.components.get(CommentUtil);
  const comment = await commentUtil.get(1);

  expect(comment.props?.comment_ID).toBe(1);
});

test("containsNGWord", async () => {
  const context = await Application.getContext("single");
  const optionsTrx = context.components.get(OptionsTrx);
  const commentUtil = context.components.get(CommentUtil);

  const disallowedKey = "__word__";
  await optionsTrx.insert(
    "disallowed_keys",
    `word1\nword2ý\n${disallowedKey}\nlkjsadfsfslkjasd`,
    {
      upsert: true,
    }
  );

  let result = await commentUtil.containsNGWord({
    comment_content: disallowedKey,
  });
  expect(result).toBe(true);

  result = await commentUtil.containsNGWord({
    comment_content: "comment",
  });
  expect(result).toBe(false);
});

test("isValid and getStatus", async () => {
  const context = await Application.getContext("single");
  const optionsTrx = context.components.get(OptionsTrx);
  const commentUtil = context.components.get(CommentUtil);
  const commentTrx = context.components.get(CommentTrx);
  const userUtil = context.components.get(UserUtil);
  const postTrx = context.components.get(PostTrx);

  // If manual moderation is enabled, skip all checks and return false.
  await optionsTrx.insert("comment_moderation", 1, {
    upsert: true,
  });

  let result: any = await commentUtil.isValid({
    comment_content: "comment",
  });
  expect(result).toBe(false);

  await optionsTrx.insert("comment_moderation", 0, {
    upsert: true,
  });

  // Check for max links
  await optionsTrx.insert("comment_max_links", 1, {
    upsert: true,
  });

  result = await commentUtil.isValid({
    comment_content: "<a href='http://localhost' />link</a>",
  });
  expect(result).toBe(false);

  await optionsTrx.insert("comment_max_links", 100000, {
    upsert: true,
  });

  const moderationKey = "__moderation_keys__";
  await optionsTrx.insert("moderation_keys", moderationKey, {
    upsert: true,
  });
  result = await commentUtil.isValid({
    comment_content: moderationKey,
  });
  expect(result).toBe(false);

  const random = Math.floor(Math.random() * 100000);
  const author = `__comment_is_valid_${random}`;
  const authorEmail = `${author}@test.com`;

  // Check if the option to approve comments by previously-approved authors is enabled.
  await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author: author,
    comment_author_email: authorEmail,
    comment_content: "comment",
    comment_approved: "1",
  });

  await optionsTrx.insert("comment_previously_approved", 1, {
    upsert: true,
  });

  // returns false as commentType is set as "pingback"
  result = await commentUtil.isValid({
    comment_content: "comment",
    comment_author: author,
    comment_author_email: authorEmail,
    comment_type: "pingback",
  });
  expect(result).toBe(false);

  result = await commentUtil.isValid({
    comment_content: "comment",
    comment_author: author,
    comment_author_email: authorEmail,
    comment_type: "comment",
  });
  expect(result).toBe(true);

  const adminUser = await userUtil.get(1);
  await commentTrx.upsert({
    comment_post_ID: 1,
    user_id: adminUser.props?.ID,
    comment_content: "comment",
    comment_author: adminUser.props?.display_name,
    comment_author_email: adminUser.props?.user_email,
    comment_approved: "1",
  });

  result = await commentUtil.isValid({
    comment_content: "comment",
    comment_author: adminUser.props?.display_name,
    comment_author_email: adminUser.props?.user_email,
    comment_type: "comment",
  });
  expect(result).toBe(true);

  await optionsTrx.insert("comment_previously_approved", 0, {
    upsert: true,
  });

  result = await commentUtil.isValid({
    comment_content: "comment",
    comment_author: "___some_user____",
    comment_author_email: "___some_user____@test.com",
    comment_type: "comment",
  });
  expect(result).toBe(true);

  // getStatus - duplicate check
  const postId = await postTrx.upsert({
    post_author: adminUser.props?.ID,
    post_title: `__title__${random}`,
    post_excerpt: "excerpt",
  });

  await commentTrx.upsert({
    comment_post_ID: postId,
    user_id: adminUser.props?.ID,
    comment_content: "comment",
    comment_author: adminUser.props?.display_name,
    comment_author_email: adminUser.props?.user_email,
    comment_approved: "1",
  });

  let ok = false;
  try {
    await commentUtil.getStatus({
      comment_post_ID: postId,
      comment_author: adminUser.props?.display_name,
      comment_author_email: adminUser.props?.user_email,
      comment_parent: 0,
    });
  } catch (e) {
    expect(`${e}`).toBe("Error: comment_duplicate");
    ok = true;
  }
  expect(ok).toBe(true);

  const queryUtil = context.components.get(QueryUtil);

  const userAuthor = await queryUtil.users((query) => {
    query.withRoles(["author"]).builder.first();
  }, val.database.wpUsers);

  const authorPostId = await postTrx.upsert({
    post_author: userAuthor?.ID,
    post_title: `__title__author_${random}`,
    post_excerpt: "excerpt",
  });

  // User can create comment on own post
  result = await commentUtil.getStatus({
    comment_post_ID: authorPostId,
    user_id: userAuthor?.ID,
    comment_author: userAuthor?.display_name,
    comment_author_email: userAuthor?.user_email,
  });
  expect(result).toBe("1");

  // Admin user can create comment on any post
  result = await commentUtil.getStatus({
    comment_post_ID: authorPostId,
    user_id: adminUser.props?.ID,
    comment_author: adminUser.props?.display_name,
    comment_author_email: adminUser.props?.user_email,
  });
  expect(result).toBe("1");

  // user can create comment on non-post
  result = await commentUtil.getStatus({
    user_id: userAuthor?.ID,
    comment_author: userAuthor?.display_name,
    comment_author_email: userAuthor?.user_email,
    comment_content: "comment",
    comment_type: "comment",
  });

  expect(result).toBe("1");

  const disallowedKey = "__word__";
  await optionsTrx.insert("disallowed_keys", `${disallowedKey}`, {
    upsert: true,
  });

  // When comment contains NG Words and moderationKey
  result = await commentUtil.getStatus({
    comment_author: userAuthor?.display_name,
    comment_author_email: userAuthor?.user_email,
    comment_content: `comment ${moderationKey} ${disallowedKey}`,
    comment_type: "comment",
  });
  expect(result).toBe("trash");

  // When comment contains moderationKey
  result = await commentUtil.getStatus({
    comment_author: userAuthor?.display_name,
    comment_author_email: userAuthor?.user_email,
    comment_content: `comment ${moderationKey} `,
    comment_type: "comment",
  });
  expect(result).toBe("0");
});
