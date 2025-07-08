import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { Vars } from "@rnaga/wp-node/core/vars";
import { RolesCrud } from "@rnaga/wp-node/crud/roles.crud";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { BlogTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("create", async () => {
  const dbName = "wptest-role-create-crud-test-multi";
  const testAppName = "role_create_crud_test_multi";

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

  const userName = "__role_create_crud_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "role_create_crud_blog_sitename";

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
  });

  await context.current.assumeUser(userId);

  const roleCrud = context.components.get(RolesCrud);
  const inputData = {
    role: "custom",
    name: "Custom",
    capabilities: ["edit_custom"],
  };
  const result = await roleCrud.create(inputData, {
    siteId,
    blogId,
  });
  expect(result.data).toBe(true);

  // Can't add existing role
  await expect(
    roleCrud.create(inputData, {
      siteId,
      blogId,
    })
  ).rejects.toThrow();

  await context.current.switchBlog(blogId);

  const vars = context.components.get(Vars);
  const userRoles = vars.USER_ROLES;

  expect(userRoles["custom"].name).toBe("Custom");

  const userCrud = context.components.get(UserCrud);
  const random = Math.floor(Math.random() * 100000);
  const userLoginAuthor = `__role_create_crud_author_${random}`;
  const userEmailAuthor = `${userLoginAuthor}@test.com`;
  const userData = await userCrud.create({
    user_login: userLoginAuthor,
    user_email: userEmailAuthor,
    user_pass: "1234",
    role: "author",
  });

  await context.current.assumeUser(userData.data.ID);

  await expect(
    roleCrud.create({
      role: "custom2",
      name: "Custom2",
      capabilities: ["edit_custom2"],
    })
  ).rejects.toThrow();

  await helpers.dropDatabase(dbName);
});
