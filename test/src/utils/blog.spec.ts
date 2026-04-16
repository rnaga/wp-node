import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { BlogTrx } from "@rnaga/wp-node/transactions";

import * as helpers from "../../helpers";

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

test("getBlogFromUrl", async () => {
  const dbName = "wptest-get-blog-from-url-test-multi";
  const testAppName = "get_blog_from_url_test_multi";

  // Create a test database
  await helpers.createDatabase(dbName);

  Application.configs = {
    ...helpers.getBaseAppConfig(),
    ...helpers.getAppConfig({
      appName: testAppName,
      isMulti: true,
      database: {
        user: "root",
        password: "root",
        database: dbName,
      },
    }),
  };

  const context = await Application.getContext(testAppName);
  const installer = context.components.get(Installer);
  const blogTrx = context.components.get(BlogTrx);

  const userName = "__get_blog_from_url_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost-get-blog-from-url";
  const path = "/test-path";
  const siteName = "get_blog_from_url_sitename";

  const { userId } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  // Initialize site and create a primary blog
  const siteId = await installer.initializeSite(
    {
      domain,
      email: userEmail,
      siteName,
      path,
    },
    {
      subdomainInstall: true,
    }
  );

  const blogPath = `/test_${Math.floor(Math.random() * 1000)}`;

  // Insert
  const blogId = await blogTrx.upsert({
    site_id: siteId,
    user_id: userId,
    title: "__test__title__",
    path: blogPath,
    domain,
    blog_meta: {
      key1: 1,
      key2: "key",
    },
  });

  const blogUtil = context.components.get(BlogUtil);

  const blog = await blogUtil.getBlogFromUrl(domain, blogPath);

  console.log("blog", blog);
  expect(blog?.blog_id).toBe(blogId);

  await helpers.dropDatabase(dbName);
});
