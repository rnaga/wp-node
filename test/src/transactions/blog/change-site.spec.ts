import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { BlogTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("changeSite", async () => {
  const dbName = "wptest-change-site-blog-test-multi";
  const testAppName = "change_site_blog_test_multi";

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

  const userName = "__change_site_blog_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "change_site_blog_sitename";

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

  // Create the second site
  const siteIdChange = await installer.initializeSite(
    {
      domain: `${domain}___change`,
      email: userEmail,
      siteName: `${siteName}__change`,
      path: "/site__change",
    },
    {
      subdomainInstall: true,
    }
  );

  await blogTrx.changeSite(blogId, siteIdChange, {
    domain: "localhost__change",
    path: "/__change",
  });

  blog = await context.components.get(BlogUtil).get(blogId);
  expect(blog.props?.site_id).toBe(siteIdChange);
  expect(blog.props?.domain).toBe("localhost__change");
  expect(blog.props?.path).toBe("/__change");

  await helpers.dropDatabase(dbName);
});
