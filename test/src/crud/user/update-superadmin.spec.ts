import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { RolesUtil } from "@rnaga/wp-node/core/utils/roles.util";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("updateSuperAdmin", async () => {
  const dbName = "wptest-user-update-superadmin-crud-test-multi";
  const testAppName = "user_update_superadmin_crud_test_multi";

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

  const userTrx = context.components.get(UserTrx);
  const installer = context.components.get(Installer);

  const random = Math.floor(Math.random() * 100000);

  const userName = "__user_update_superadmin_crud_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "user_update_superadmin_crud_sitename";

  const { userId: siteUserId } = await installer.install({
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

  await context.current.switchSite(1, 1);
  await context.current.assumeUser(siteUserId);

  const userCrud = context.components.get(UserCrud);
  await userCrud.updateSuperAdmin(userId);

  const roleUtil = context.components.get(RolesUtil);

  let superAdmins = await roleUtil.getSuperAdmins({ blogId: 1 });
  expect(superAdmins.includes(userLogin)).toBe(true);

  await userCrud.updateSuperAdmin(userId, { remove: true });
  superAdmins = await roleUtil.getSuperAdmins({ blogId: 1 });
  expect(superAdmins.includes(userLogin)).toBe(false);

  await helpers.dropDatabase(dbName);
});
