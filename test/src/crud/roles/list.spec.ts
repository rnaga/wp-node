import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { RolesCrud } from "@rnaga/wp-node/crud/roles.crud";
import { BlogTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("list - multisite", async () => {
  const dbName = "wptest-role-crud-test-multi";
  const testAppName = "role_crud_test_multi";

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

  const userName = "__role_crud_test_"; // super admin
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "role_crud_sitename";

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

  // Create second blog
  const blogId = await blogTrx.upsert({
    site_id: siteId,
    user_id: siteUserId,
    path: `/role_crud_1_${random}`,
    domain: "localhost",
  });

  const userLoginAdmin = `role_crud_list_admin_${random}`;
  const userIdAdmin = await userTrx.upsert(
    {
      user_email: `role_crud_list_admin${random}@test.com`,
      user_pass: "123456",
      user_login: userLoginAdmin,
    },
    {
      attachRole: false,
    }
  );

  // Add admin role for the second blog (id = 2)
  await blogTrx.addUser(blogId, userIdAdmin, "administrator");

  await context.current.switchSite(siteId, blogId);
  await context.current.assumeUser(userIdAdmin);

  const rolesCrud = context.components.get(RolesCrud);

  const result = await rolesCrud.list({
    blog_ids: [blogId],
  });

  expect(result.data.length).toBe(1);
  expect(result.data[0].blog.blog_id).toBe(2);
  expect(result.data[0].roles.administrator.name).toBe("Administrator");

  // admin doesn't have permission to the primary blog
  await expect(
    rolesCrud.list({
      blog_ids: [blogId, 1],
    })
  ).rejects.toThrow();

  // super admin has permission to all blogs
  const userUtil = context.components.get(UserUtil);
  const superAdmin = await userUtil.get(userName);
  const superAdminUserId = superAdmin.props?.ID as number;

  await context.current.assumeUser(superAdminUserId);

  const result2 = await rolesCrud.list({
    blog_ids: [blogId, 1],
  });

  expect(result2.data.length).toBe(2);
  await helpers.dropDatabase(dbName);
});

test("list - single site", async () => {
  const context = await Application.getContext("single");
  const rolesCrud = context.components.get(RolesCrud);
  const { admin } = await helpers.getTestUsers(context);

  await context.current.assumeUser(admin);

  const roles = await rolesCrud.list({ blog_ids: [1, 2, 3, 4] });
  expect(roles.data.length).toBe(1);
  expect(roles.data[0].blog.blog_id).toBe(1);
  expect(roles.data[0].roles["administrator"]).not.toBe(undefined);
});
