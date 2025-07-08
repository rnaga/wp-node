import Application from "@rnaga/wp-node/application";
import { Blog } from "@rnaga/wp-node/core/blog";

test("get a blog", async () => {
  const context = await Application.getContext("multi");

  const blog = await context.components.asyncGet(Blog, [1]);
  expect(blog.props?.blog_id).toBe(1);

  const metas = await blog.meta.props();
  expect(metas).not.toBe(undefined);
});
