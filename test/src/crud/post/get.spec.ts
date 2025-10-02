import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import { PostTrx } from "@rnaga/wp-node/transactions/post.trx";
import { getTestUsers } from "../../../helpers";

const postTitle = "__crud_post_get__";
let postId = 0;

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
});

test("get post", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);

  const { subscriber, admin, anonymous } = await getTestUsers(context);
  const postCrud = context.components.get(PostCrud);

  await postTrx.upsert({
    ID: postId,
    post_status: "publish",
    post_password: "1234",
  });

  await context.current.assumeUser(anonymous);

  let post = (await postCrud.get(1)).data;
  expect(post).toHaveProperty("metas");
  expect(Array.isArray(post.categories)).toBe(true);
  expect(Array.isArray(post.tags)).toBe(true);

  // anonymous user needs password to view password protected post
  post = (await postCrud.get(postId)).data;
  expect(post.post_content == "").toBe(true);

  post = (await postCrud.get(postId, { password: "1234" })).data;
  expect(post.post_content.length > 0).toBe(true);

  // Admin can view password protected post
  await context.current.assumeUser(admin);
  post = (await postCrud.get(postId)).data;
  expect(post.ID).toBe(postId);

  await postTrx.upsert({
    ID: postId,
    post_status: "private",
  });

  // subscriber can't view private post
  await context.current.assumeUser(subscriber);
  let ok = false;
  try {
    post = (await postCrud.get(postId)).data;
  } catch (e) {
    ok = true;
  }
  expect(ok).toBe(true);

  // Admin can view private post
  await context.current.assumeUser(admin);
  ok = true;
  try {
    post = (await postCrud.get(postId)).data;
  } catch (e) {
    ok = false;
  }
  expect(ok).toBe(true);
});
