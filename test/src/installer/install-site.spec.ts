import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { Options } from "@rnaga/wp-node/core/options";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import * as val from "@rnaga/wp-node/validators";
import * as helpers from "../../helpers";

test("install site", async () => {
  const dbName = "wptest-installer-test-multi";
  const testAppName = "installer_test_multi";

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
  const queryUtil = context.components.get(QueryUtil);
  const options = context.components.get(Options);
  const installer = context.components.get(Installer);

  const userName = "__installer_username_";
  const userEmail = `${userName}@example.com`;

  const { url, userId, password } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  expect(password && password.length > 0).toBe(true);

  const user = await queryUtil.users((query) => {
    query.where("ID", userId).builder.first();
  }, val.database.wpUsers);
  expect(user?.ID).toBe(userId);

  const siteUrl = await options.get("siteUrl");
  expect(siteUrl).toBe(url);

  // Re-run installer
  const {
    url: url2,
    userId: userId2,
    password: password2,
  } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__2_",
    userName,
    userEmail,
    isPublic: true,
  });

  expect(url2).toBe(url);
  expect(userId2).toBe(userId);

  // password isn't re-generated as user already exists
  expect(password2).toBe(undefined);

  expect(await options.get("blogname")).toBe("__installer_blog__2_");
  expect(await options.get("admin_email")).toBe(userEmail);

  await helpers.dropDatabase(dbName);
});
