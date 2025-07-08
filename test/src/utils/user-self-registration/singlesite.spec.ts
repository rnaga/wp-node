import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { Options } from "@rnaga/wp-node/core/options";
import { UserSelfRegistrationUtil } from "@rnaga/wp-node/core/utils/user-self-registration.util";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import * as helpers from "../../../helpers";

test("user self registration - single site", async () => {
  const dbName = "wptest-user-self-registration-single";
  const testAppName = "user_self_registration_single";

  // Create a test database
  await helpers.createDatabase(dbName);

  Application.configs = {
    ...helpers.getBaseAppConfig(),
    ...helpers.getAppConfig({
      appName: testAppName,
      isMulti: false,
      database: {
        user: "root",
        password: "root",
        database: dbName,
      },
    }),
  };

  const context = await Application.getContext(testAppName);

  const installer = context.components.get(Installer);

  const userSelfRegistration = context.components.get(UserSelfRegistrationUtil);

  const userName = "__user_self_registration_test_";
  const userEmail = `${userName}@example.com`;

  await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  expect(await userSelfRegistration.canSignup()).toBeFalsy();

  // Enable user registration
  await userSelfRegistration.changeEligibility(true);

  expect(await userSelfRegistration.canSignup()).toBeTruthy();

  const newUserLogin = "newuser";
  const newUserEmail = `${newUserLogin}@test.com`;
  const result = await userSelfRegistration.registerNew(
    newUserLogin,
    newUserEmail
  );

  const activationKey = result.activationKey;
  expect(activationKey).toBeDefined();

  const [success, errorOrResetKey] = await userSelfRegistration.activate(
    activationKey as string,
    newUserLogin
  );

  expect(success).toBeTruthy();
  expect(errorOrResetKey).toBeDefined();

  // Check role is attached (subscriber)
  const userUtil = context.components.get(UserUtil);
  const user = await userUtil.get(newUserLogin);

  const role = await user.role();

  const options = context.components.get(Options);
  const defaultRole = await options.get("default_role");

  expect(role.names.has(defaultRole as string)).toBeTruthy();

  await helpers.dropDatabase(dbName);
});
