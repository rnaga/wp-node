import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { Vars } from "@rnaga/wp-node/core/vars";
import { RolesCrud } from "@rnaga/wp-node/crud/roles.crud";
import * as helpers from "../../../helpers";

test("remove", async () => {
  const dbName = "wptest-role-remove-crud-test-multi";
  const testAppName = "role_remove_crud_test_multi";

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

  const userName = "__role_remove_crud_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "role_remove_crud_blog_sitename";

  await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  // Initialize site and create a primary blog
  await installer.initializeSite(
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

  await context.current.switchSite(1, 1);
  await context.current.assumeUser(1);

  const roleCrud = context.components.get(RolesCrud);
  await roleCrud.create({
    role: "custom",
    name: "Custom",
    capabilities: ["edit_custom"],
  });

  const result = await roleCrud.delete("custom");
  expect(result.data).toBe(true);
  const vars = context.components.get(Vars);
  const userRoles = vars.USER_ROLES;

  expect(userRoles["custom"]).toBe(undefined);

  await helpers.dropDatabase(dbName);
});
