import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { SignupUtil } from "@rnaga/wp-node/core/utils/signup.util";
import { UserSelfRegistrationUtil } from "@rnaga/wp-node/core/utils/user-self-registration.util";
import * as helpers from "../../../helpers";
import type * as types from "@rnaga/wp-node/types";

test("user self registration - multsite", async () => {
  const dbName = "wptest-user-self-registration-multi";
  const testAppName = "user_self_registration_multi";

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

  const userSelfRegistration = context.components.get(UserSelfRegistrationUtil);

  const userName = "__user_self_registration_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "user_self_registration_sitename";

  await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  // Initialize site and create a primary blog
  const siteId = await installer.initializeSite({
    domain,
    email: userEmail,
    siteName,
    path: "/site",
  });

  // Switch to the new site
  await context.current.switchSite(siteId, 1);

  // Set action hook
  let hooksActivationKey: string | undefined;
  context.hooks.action.add(
    "core_register_new_user",
    async (...args: types.hooks.ActionParameters<"core_register_new_user">) => {
      const [activationKey] = args;

      hooksActivationKey = activationKey;
    }
  );

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
  expect(hooksActivationKey).toBe(activationKey);

  // When activating with invalid user login
  await expect(
    userSelfRegistration.activate(
      activationKey as string,
      "__invalid_user_login__"
    )
  ).rejects.toThrow();

  const [success, errorOrResetKey2] = await userSelfRegistration.activate(
    activationKey as string,
    newUserLogin
  );

  expect(success).toBeTruthy();
  expect(errorOrResetKey2).toBeDefined();

  const signupUtil = context.components.get(SignupUtil);

  // Already signed up?
  const resultAlreadySignedUp = await signupUtil.alreadySignedUp({
    userLoginOrEmail: newUserLogin,
  });

  expect(resultAlreadySignedUp).toBeTruthy();

  await helpers.dropDatabase(dbName);
});
