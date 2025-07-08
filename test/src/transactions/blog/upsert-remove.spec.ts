import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { BlogTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("upsert and remove", async () => {
  const dbName = "wptest-upsert-blog-test-multi";
  const testAppName = "upsert_blog_test_multi";

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

  const userName = "__upsert_blog_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "upsert_blog_sitename";

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
      path: "/site",
    },
    {
      subdomainInstall: true,
    }
  );

  // Insert
  const blogId = await blogTrx.upsert({
    site_id: siteId,
    user_id: userId,
    title: "__test__title__",
    path: `/test_${Math.floor(Math.random() * 1000)}`,
    domain: "localhost",
    blog_meta: {
      key1: 1,
      key2: "key",
    },
  });

  let blog = await context.components.get(BlogUtil).get(blogId);
  expect(blog.props?.domain).toBe("localhost");

  // Remove
  await blogTrx.upsert({
    blog_id: blogId,
    site_id: 1,
    path: `/test_2_${Math.floor(Math.random() * 1000)}`,
    domain: "localhost_2",
    blog_meta: {
      key1: 2,
      key2: "key2",
      key3: "key3",
    },
  });

  blog = await context.components.get(BlogUtil).get(blogId);
  expect(blog.props?.domain).toBe("localhost_2");

  blog = await blogTrx.remove(blogId);
  expect(blog.props?.blog_id).toBe(blogId);

  await helpers.dropDatabase(dbName);
});
