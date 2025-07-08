import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { Installer } from "@rnaga/wp-node/core/installer";
import { Options } from "@rnaga/wp-node/core/options";
import { Vars } from "@rnaga/wp-node/core/vars";
import { RolesTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("upsert and remove", async () => {
  const dbName = "wptest-roles-trx-test";
  const testAppName = "roles_trx_test";

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

  const userName = "__roles_trx_test_";
  const userEmail = `${userName}@example.com`;

  await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  const rolesTrx = context.components.get(RolesTrx);

  // Add role
  let result = await rolesTrx.upsert({
    role: "custom",
    capabilities: ["edit_custom"],
  });

  expect(result).toBe(true);

  const vars = context.components.get(Vars);
  let userRoles = vars.USER_ROLES;

  expect(userRoles["custom"].name).toBe("custom");

  // Remove role
  result = await rolesTrx.remove("custom");
  expect(result).toBe(true);

  userRoles = vars.USER_ROLES;

  // Update role's capabilities
  result = await rolesTrx.upsert({
    role: "subscriber",
    capabilities: [...userRoles["subscriber"].capabilities, "edit_custom"],
  });

  userRoles = vars.USER_ROLES;
  expect(userRoles["custom"]).toBe(undefined);
  expect(userRoles["subscriber"].capabilities.includes("edit_custom")).toBe(
    true
  );

  // Change roleName
  result = await rolesTrx.upsert({
    role: "subscriber",
    new_role: "new_subscriber",
  });

  userRoles = vars.USER_ROLES;
  expect(userRoles["new_subscriber"].name).toBe("Subscriber");

  // Can't change roleName to existing one
  let ok = false;

  try {
    result = await rolesTrx.upsert({
      role: "editor",
      new_role: "author",
    });
  } catch (e) {
    ok = true;
  }
  expect(ok).toBe(true);

  // Invalid role name
  try {
    result = await rolesTrx.upsert({
      role: "new_subscriber",
      new_role: "__A_invalid__",
    });
  } catch (e) {
    ok = true;
  }
  expect(ok).toBe(true);

  // Check records in DB
  const current = context.components.get(Current);
  const optionsKey = `${current.tables.prefix}user_roles`;
  const options = context.components.get(Options);

  const resultRoles = await options.get(optionsKey);

  expect(resultRoles).toHaveProperty("administrator");

  // Check if prohibited roles are not stored in DB
  expect(resultRoles).not.toHaveProperty("superadmin");
  expect(resultRoles).not.toHaveProperty("anonymous");

  await helpers.dropDatabase(dbName);
});
