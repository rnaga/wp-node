import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { BlogTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("multisite", async () => {
  const dbName = "wptest-user-crud-test-multi";
  const testAppName = "user_crud_test_multi";

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

  const blogTrx = context.components.get(BlogTrx);
  const userTrx = context.components.get(UserTrx);
  const installer = context.components.get(Installer);

  const random = Math.floor(Math.random() * 100000);

  const userName = "__user_crud_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "user_crud_sitename";

  const { userId: siteUserId } = await installer.install({
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

  // Create 2 blogs to compare permission
  const blogId1 = await blogTrx.upsert({
    site_id: siteId,
    user_id: siteUserId,
    path: `/user_crud_1_${random}`,
    domain: "localhost",
  });

  const blogId2 = await blogTrx.upsert({
    site_id: siteId,
    user_id: siteUserId,
    path: `/user_crud_2_${random}`,
    domain: "localhost",
  });

  const userLogin = `user_crud_list_${random}`;
  const userId = await userTrx.upsert(
    {
      user_email: `user_crud_list_${random}@test.com`,
      user_pass: "123456",
      user_login: userLogin,
    },
    {
      attachRole: false,
    }
  );

  // Add user to a first blog as admin
  let result = await blogTrx.addUser(blogId1, userId, "administrator");
  expect(result).toBe(true);

  // Add user to a second blog as author
  result = await blogTrx.addUser(blogId2, userId, "author");

  const userCrud = context.components.get(UserCrud);

  // Switch to second blog (author), try to list user in first blog (admin)
  await context.current.switchSite(siteId, blogId2);
  await context.current.assumeUser(userId);

  const response = await userCrud.list(
    { blog_id: blogId1 },
    { context: "edit" }
  );
  expect(response.data.length > 0).toBe(true);

  // Switch to first blog (admin), try to list user in first blog (author)
  // This fails
  await context.current.switchSite(siteId, blogId1);
  await context.current.assumeUser(userId);

  await expect(
    userCrud.list({ blog_id: blogId2 }, { context: "edit" })
  ).rejects.toThrow();

  // Check current site id
  expect(context.current.blogId).toBe(blogId1);

  await helpers.dropDatabase(dbName);
});
