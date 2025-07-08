import Application from "@rnaga/wp-node/application";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";

test("get a blog", async () => {
  const context = await Application.getContext("multi");

  const blogUtil = context.components.get(BlogUtil);

  const blog = await blogUtil.get(1);

  expect(blog.props?.blog_id).toBe(1);
});

test("getMainBlogId", async () => {
  const context = await Application.getContext("multi");

  const blogUtil = context.components.get(BlogUtil);

  const blogId = await blogUtil.getMainBlogId();
  console.log(blogId);
});

test("toBlogs", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);
  const blogUtil = context.components.get(BlogUtil);

  const result = await queryUtil.blogs((query) => {
    query.builder.limit(5);
  });

  if (!result) {
    expect(false).toBe(true);
  } else {
    const blogs = blogUtil.toBlogs(result);
    expect(blogs[0].props && blogs[0].props?.blog_id > 0).toBe(true);
  }
});
