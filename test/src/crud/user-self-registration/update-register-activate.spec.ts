import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { UserSelfRegistrationCrud } from "@rnaga/wp-node/crud/user-self-registration.crud";
import * as helpers from "../../../helpers";

test("update, register and activate", async () => {
  const dbName = "wptest-user-registration-update-register-activate";
  const testAppName = "user_registration_update_register_activate";

  // Create a test database
  await helpers.createDatabase(dbName);

  const configs = {
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

  Application.configs = configs;

  const context = await Application.getContext(testAppName);
  const installer = context.components.get(Installer);

  const userName = "update_register_activate";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "update_register_activate_sitename";

  const { userId } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  await installer.initializeSite(
    {
      domain,
      email: userEmail,
      siteName,
      path: "/",
    },
    {
      subdomainInstall: true,
    }
  );

  await context.current.switchSite(1, 1);

  const userSelfRegistrationCrud = context.components.get(
    UserSelfRegistrationCrud
  );

  // Permission check
  await expect(
    userSelfRegistrationCrud.update({ eligibility: true })
  ).rejects.toThrow();

  await expect(
    userSelfRegistrationCrud.register({
      user_login: "test",
      email: "test@test.com",
    })
  ).rejects.toThrow();

  await context.current.assumeUser(userId);

  const result = await userSelfRegistrationCrud.update({ eligibility: true });

  expect(result.data).toBeTruthy();

  let activationKey: string | undefined;
  context.hooks.action.add("core_register_new_user", async (...args: any[]) => {
    const [key] = args;
    activationKey = key;
  });

  const userLogin = "newuser";
  const result2 = await userSelfRegistrationCrud.register({
    user_login: userLogin,
    email: "test@test.com",
  });

  expect(result2.data).toBeTruthy();

  const result3 = await userSelfRegistrationCrud.activate({
    key: activationKey as string,
    user_login: userLogin,
  });

  expect(result3.data).toBeTruthy();

  const externalUserLogin = "newexternaluser";
  const externalEmail = `${externalUserLogin}@test.com`;
  const result4 = await userSelfRegistrationCrud.registerWithoutActivation({
    user_login: externalUserLogin,
    email: externalEmail,
  });

  expect(result4.data).toBeTruthy();

  const userUtil = context.components.get(UserUtil);
  const externalUser = await userUtil.get(externalUserLogin);

  expect(externalUser.props?.ID).toBeGreaterThan(0);

  // When user login isn't given
  const result5 = await userSelfRegistrationCrud.registerWithoutActivation({
    email: "emailonly@test.com",
    name: "first middle last",
  });

  expect(result5.data.user_id).toBeGreaterThan(0);
  expect(result5.data.user_email).toBe("emailonly@test.com");
  expect(result5.data.first_name).toBe("first");
  expect(result5.data.last_name).toBe("middle last");

  await helpers.dropDatabase(dbName);
});
