import Application from "@rnaga/wp-node/application";
import { Post } from "@rnaga/wp-node/core/post";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";

test("get a post and terms", async () => {
  const context = await Application.getContext("single");

  const post = await context.components.asyncGet(Post, [1]);
  console.log(post);
  const terms = await post.terms("category");
  console.log(terms);
});

test("get a post and meta", async () => {
  const context = await Application.getContext("single");

  const post = await context.components.asyncGet(Post, [1]);

  expect(post.props?.ID).toBe(1);

  const post2 = await context.components.asyncGet(Post, [2]);
  const meta = await post2.meta.get("_wp_page_template");

  expect(meta == "default" || typeof meta == "undefined").toBe(true);
});

test("get a post and parents", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);

  const posts = await queryUtil.posts((query) => {
    query.where("post_parent", 0, ">");
  });

  const post = await context.components.asyncGet(Post, [(posts as any)[0].ID]);
  const parents = await post.parents();
  expect(parents.length > 0).toBe(true);
});

test("get a post and children", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);

  const posts = await queryUtil.posts((query) => {
    query.where("post_parent", 0, ">");
  });

  const post = await context.components.asyncGet(Post, [
    (posts as any)[0].post_parent,
  ]);
  const children = await post.children();
  expect(children.length > 0).toBe(true);
});

test("get author", async () => {
  const context = await Application.getContext("single");

  const post = await context.components.asyncGet(Post, [1]);

  const author = await post.author();
  expect(author?.ID).toBe(post.props?.post_author);
});
