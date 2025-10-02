import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { OptionsTrx, PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

const postTitle = "__crud_post_list__";
let postId = 0;
let privatePostId = 0;
let mimeTypePostId = 0;
const tagIds: number[] = [];

beforeAll(async () => {
  const context = await Application.getContext("single");
  const { admin } = await getTestUsers(context);
  const postTrx = context.components.get(PostTrx);
  const queryUtil = context.components.get(QueryUtil);

  const posts = await queryUtil.posts((query) => {
    query.where("post_title", postTitle);
  });

  const tags = await queryUtil.terms((query) => {
    query.where("taxonomy", "post_tag").builder.limit(3);
  });

  if (!posts) {
    postId = await postTrx.upsert({
      post_author: admin.props?.ID,
      post_title: postTitle,
      post_type: "post",
      post_password: "1234",
      post_status: "publish",
      post_content: "<!-- comment -->__content__<!-- comment -->",
      post_category: [1],
      tags_input: tags?.map((tag) => tag.name),
    });
  } else {
    postId = posts[0].ID;
  }

  tags?.map((tag) => tagIds.push(tag.term_id));

  const privatePosts = await queryUtil.posts((query) => {
    query.where("post_title", "private_post_crud_list");
  });

  if (!privatePosts) {
    privatePostId = await postTrx.upsert({
      post_author: admin.props?.ID,
      post_title: "private_post_crud_list",
      post_type: "post",
      post_status: "private",
      post_content: "<!-- comment -->__content__<!-- comment -->",
      post_category: [1],
      tags_input: tags?.map((tag) => tag.name),
      meta_input: {
        meta1: "1234",
        meta2: "56789",
      },
    });
  } else {
    privatePostId = privatePosts[0].ID;
  }

  const attachments = await queryUtil.posts((query) => {
    query
      .where("post_type", "attachment")
      .where("post_mime_type", "image/jpeg");
  });

  if (!attachments) {
    mimeTypePostId = await postTrx.upsert({
      post_author: admin.props?.ID,
      post_title: "attachment",
      post_type: "attachment",
      post_status: "inherit",
      post_content: "",
      post_mime_type: "image/jpeg",
      post_category: [1],
      tags_input: tags?.map((tag) => tag.name),
    });
  } else {
    mimeTypePostId = attachments[0].ID;
  }
});

test("list", async () => {
  const context = await Application.getContext("single");
  const optionsTrx = context.components.get(OptionsTrx);
  const { subscriber, admin } = await getTestUsers(context);
  const postCrud = context.components.get(PostCrud);

  await context.current.assumeUser(subscriber);

  await optionsTrx.insert("sticky_posts", [1, 2, 3, postId], {
    seriazlie: true,
    upsert: true,
  });

  let posts = await postCrud.list({
    offset: 0,
    search: postTitle,
    after: "2021-01-01",
    before: "2125-01-01",
    modified_after: "2021-01-01",
    modified_before: "2125-01-01",
    sticky: true,
    author: [subscriber.props?.ID ?? 0, admin.props?.ID ?? 0],
    categories: [1],
    tags: tagIds,
  });

  expect(posts.data.length > 0).toBe(true);
  expect(posts.data.length).toBe(posts.info.pagination.count);

  // Subsciber can't see private post
  let privatePosts = await postCrud.list({
    include: [privatePostId],
  });

  expect(privatePosts.info?.pagination.count).toBe(0);

  // Admin can see private post
  await context.current.assumeUser(admin);

  privatePosts = await postCrud.list(
    {
      include: [privatePostId],
    },
    { context: "edit" }
  );

  expect(privatePosts.info.pagination.count).toBe(1);

  // edit mode returns raw content
  posts = await postCrud.list(
    {
      search: postTitle,
    },
    { context: "edit" }
  );

  const result = posts.data[0]?.post_content.match(/<!--/);
  expect(result).not.toBe(null);
});

test("attachment", async () => {
  const context = await Application.getContext("single");
  const postCrud = context.components.get(PostCrud);
  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  console.log("mimeTypePostId", mimeTypePostId);

  const posts = await postCrud.list(
    { include: [mimeTypePostId], status: ["inherit"] },
    {
      postTypes: ["attachment"],
      mimeTypes: ["image/jpeg", "image/png"],
    }
  );

  expect(posts.data.length > 0).toBe(true);

  // Get all images
  const posts2 = await postCrud.list(
    { include: [mimeTypePostId], status: ["inherit"] },
    {
      postTypes: ["attachment"],
      mimeTypes: ["image"],
    }
  );

  expect(posts2.data.length > 0).toBe(true);

  // mimeTypes is not image/jpeg
  const posts3 = await postCrud.list(
    { include: [mimeTypePostId], status: ["inherit"] },
    {
      postTypes: ["attachment"],
      mimeTypes: ["image/png"],
    }
  );

  expect(posts3.data.length).toBe(0);
});

test("countGroupBy", async () => {
  const context = await Application.getContext("multi");
  const postCrud = context.components.get(PostCrud);

  const result = await postCrud.list(
    {},
    {
      countGroupBy: "post_status",
    }
  );

  expect(result.info.countGroupBy?.[0].post_status).not.toBe(undefined);
  expect(
    result.info.countGroupBy && result.info.countGroupBy[0].count
  ).not.toBe(true);
});

test("list with meta", async () => {
  const context = await Application.getContext("single");
  const postCrud = context.components.get(PostCrud);
  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const posts = await postCrud.list(
    {
      meta: { key: "_wp_page_template", value: "default" },
    },
    {
      context: "edit",
      postTypes: ["page"],
    }
  );

  expect(posts.data.length > 0).toBeTruthy();
});

test("list without meta", async () => {
  const context = await Application.getContext("single");
  const postCrud = context.components.get(PostCrud);
  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const posts = await postCrud.list(
    {
      exclude_meta: { key: "_wp_page_template", value: "default" },
    },
    {
      context: "edit",
      postTypes: ["page"],
    }
  );

  expect(Array.isArray(posts.data)).toBeTruthy();
});
