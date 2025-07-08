import Application from "@rnaga/wp-node/application";
import { Config } from "@rnaga/wp-node/config";
import { Post } from "@rnaga/wp-node/core/post";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TrxUtil } from "@rnaga/wp-node/core/utils/trx.util";
import { MetaTrx, PostTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";

test("get a post", async () => {
  const context = await Application.getContext("single");

  const postUtil = context.components.get(PostUtil);
  const post = await postUtil.get(1);

  expect(post.props?.ID).toBe(1);
});

test("get a post by slug", async () => {
  const context = await Application.getContext("single");

  const random = Math.floor(Math.random() * 100000);
  const slug = `test-get-a-post-by-slug-${random}`;
  const postTrx = context.components.get(PostTrx);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: `Test Get A Post By Slug ${random}`,
    post_name: slug,
  });

  const postUtil = context.components.get(PostUtil);
  const post = await postUtil.getBySlug(slug);

  expect(post?.props?.ID).toBe(postId);
});

test("get post type object", async () => {
  const context = await Application.getContext("single");

  const posts = context.components.get(PostUtil);
  const type = posts.getTypeObject("post");

  expect(type && type.supports.length > 0).toBe(true);

  const type2 = posts.getTypeObject("___");
  expect(type2 && type2.supports.length > 0 ? true : false).toBe(false);
});

test("get post status", async () => {
  const context = await Application.getContext("single");
  const posts = context.components.get(PostUtil);

  const post = await context.components.asyncGet(Post, [1]);

  let postStatus = await posts.getStatus(post);

  expect(postStatus).toBe("publish");

  post.withProps({
    post_type: "attachment",
    post_parent: 0,
    post_status: "inherit",
  });

  postStatus = await posts.getStatus(post);

  expect(postStatus).toBe("publish");
});

test("get post status object", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);

  const status = postUtil.getStatusObject("publish");
  expect(status?.label).toBe("Published");
});

test("get a unique slug", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);
  const queryUtil = context.components.get(QueryUtil);

  const pages = await queryUtil.posts((query) => {
    query
      .where("post_type", "page")
      .where("post_status", "publish")
      .builder.not.__ref(query)
      .where("post_name", "")
      .builder.limit(1);
  });

  const page = await postUtil.get(((pages as any)[0] as any).ID);
  const desiredSlug = page.props?.post_name ?? "";
  const slug = await postUtil.getUniqueSlug(desiredSlug, page);
  expect(slug).toBe(desiredSlug);

  const pageNone = await postUtil.get(-1);
  const slug2 = await postUtil.getUniqueSlug(desiredSlug, pageNone);
  expect(slug2).toBe(`${desiredSlug}-2`);

  const slug3 = await postUtil.getUniqueSlug(desiredSlug, page, 0);
  expect(slug3).not.toBe(slug);

  const slug4 = await postUtil.getUniqueSlug("", -1);
  expect(slug4).toBe("");
});

test("is status viewable", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);

  const statusObject = postUtil.getStatusObject("publish");
  let result = postUtil.isStatusViewable(statusObject);
  expect(result).toBe(true);

  result = postUtil.isStatusViewable("private");
  expect(result).toBe(false);
});

test("get attached file", async () => {
  const context = await Application.getContext("single");
  const trxUtil = await context.components.get(TrxUtil);
  const postUtil = context.components.get(PostUtil);
  const queryUtil = context.components.get(QueryUtil);
  const config = context.components.get(Config);

  const attachments = await queryUtil.posts((query) => {
    query.where("post_type", "attachment");
  });

  const attachmentId = (attachments as any)[0].ID as number;

  // Make it a relative path
  const file = `1234/56/WordPress789.jpg`;
  await trxUtil.meta.upsert("post", attachmentId, "_wp_attached_file", file);

  const result = await postUtil.getAttachedFile(attachmentId);

  expect(result).toBe(`${config.config.staticAssetsPath}/${file}`);
});

test("toPost", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);
  const queryUtil = context.components.get(QueryUtil);

  const postRaw = await queryUtil.posts((query) => {
    query.where("ID", 1).builder.first();
  }, val.database.wpPosts);

  if (!postRaw) {
    expect(false).toBe(true);
  } else {
    const post = postUtil.toPost(postRaw);
    expect(post.props?.ID).toBe(1);
  }
});

test("count", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);

  const count = await queryUtil.posts((query) => {
    query.count("posts", "ID");
  }, val.query.resultCount);

  expect(count && count?.count > 0).toBe(true);
});

test("toPosts", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);
  const queryUtil = context.components.get(QueryUtil);

  const postRaw = await queryUtil.posts((query) => {
    query.where("ID", 1);
  });

  if (!postRaw) {
    expect(false).toBe(true);
  } else {
    const posts = postUtil.toPosts(postRaw);
    expect(posts[0].props?.ID).toBe(1);
  }
});

test("get attachment metadata", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);
  const metaTrx = context.components.get(MetaTrx);
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

  await metaTrx.upsert("post", postId, "_wp_attachment_metadata", json, {
    serialize: true,
  });

  const metadata = await postUtil.getAttachmentMetadata(postId);

  expect(metadata?.file).toBe(json.file);
});

test("getViewableTypes", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);

  const postTypes = postUtil.getViewableTypes();
  expect(postTypes.includes("post")).toBe(true);
});
