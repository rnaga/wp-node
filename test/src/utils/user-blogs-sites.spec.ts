import Application from "@rnaga/wp-node/application";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { BlogTrx, UserTrx } from "@rnaga/wp-node/transactions";

test("getBlogs and getMultiSites", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);
  const blogTrx = context.components.get(BlogTrx);
  const userTrx = context.components.get(UserTrx);

  const random = Math.floor(Math.random() * 10000);

  // Create admin user
  const adminUserId = await userTrx.upsert({
    user_email: `test_user_get_blog_admin${random}@test.com`,
    user_pass: "123456",
    user_login: `test_user_get_blog_admin${random}`,
    role: "administrator",
  });

  // Create user
  const userLogin = `test_user_get_blog_${random}`;
  const userId = await userTrx.upsert({
    user_email: `test_user_get_blog_${random}@test.com`,
    user_pass: "123456",
    user_login: userLogin,
    role: "editor",
  });

  const blogIds = [];

  // Create blogs
  for (let i = 0; i < 5; i++) {
    const blogId = await blogTrx.upsert({
      site_id: 1,
      user_id: adminUserId,
      path: `/test_user_get_blog_${i}_${random}`,
      domain: "localhost",
    });
    blogIds.push(blogId);

    // Attach role
    userTrx.usingBlog(blogId);
    await userTrx.upsertRole(userId, "editor");
  }

  const blogs = await userUtil.getBlogs(userId);

  for (const blog of blogs) {
    expect(blogIds.includes(blog.blog_id) || blog.blog_id == 1).toBe(true);
  }

  const blogsWithBlogId = await userUtil.getBlogs(userId, {
    blogId: blogIds[0],
  });

  expect(blogsWithBlogId.length).toBe(1);
  expect(blogsWithBlogId[0].blog_id).toBe(blogIds[0]);

  const sites = await userUtil.getMultiSites(userId);

  expect(sites.sites[0].blogs.length).toBe(blogs.length);

  for (const blogId of blogIds) {
    await blogTrx.remove(blogId);
  }
}, 30000);

test("getBlogs single site", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);

  const blogs = await userUtil.getBlogs(1);

  expect(blogs?.[0].blogname).toBe("wptest");
  expect(blogs?.[0].rolenames).toContain("administrator");
});
