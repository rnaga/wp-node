import Application from "@rnaga/wp-node/application";
import { Options } from "@rnaga/wp-node/core/options";
import { Schema } from "@rnaga/wp-node/core/schema";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { SeederTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("content multi site - wp_install_defaults", async () => {
  const dbName = "wptest-seeder-content_multi";
  const testAppName = "wptest_seeder_content_multi";

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
  const schema = context.components.get(Schema);
  const seederTrx = context.components.get(SeederTrx);
  const userTrx = context.components.get(UserTrx);
  const queryUtil = context.components.get(QueryUtil);
  const options = context.components.get(Options);

  await schema.build("all");

  const adminuUserLogin = "seeder_content";
  const adminuUserLogin2 = "seeder_content_2";
  const adminUser = `${adminuUserLogin}@example.com`;
  const adminUser2 = `${adminuUserLogin2}@example.com`;
  const domain = "seeder_content";
  const siteName = "seeder_sitename";

  // site seeder needs admin user
  const userId = await userTrx.upsert({
    role: "administrator",
    user_email: adminUser,
    user_login: adminuUserLogin,
  });

  // Secondary user whose capabilities will be removed
  const userId2 = await userTrx.upsert({
    role: "administrator",
    user_email: adminUser2,
    user_login: adminuUserLogin2,
  });

  // populate options
  await seederTrx.populateOptions({
    siteUrl: helpers.siteUrl,
  });

  await seederTrx.populateSite(
    {
      domain,
      email: adminUser,
      siteName,
      path: "/site",
    },
    {
      subdomainInstall: true,
    }
  );

  await seederTrx.populateContent(userId);

  const posts = await queryUtil.posts(() => {});

  if (!posts) {
    expect(false).toBe(true);
  } else {
    expect(posts.length).toBe(2);
  }

  const postCount = await options.get<number>("post_count");
  expect(postCount).toBe(1);

  const comments = await queryUtil.comments(() => {});
  expect(comments && comments.length > 0).toBe(true);

  const adminUser2After = await queryUtil.users((query) => {
    query.withRoles(["administrator"]).where("ID", userId2);
  });

  expect(adminUser2After).toBe(undefined);

  await helpers.dropDatabase(dbName);
});

test("content single site - wp_install_defaults", async () => {
  const dbName = "wptest-seeder-content_single";
  const testAppName = "wptest_seeder_content_single";

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
  const schema = context.components.get(Schema);
  const seederTrx = context.components.get(SeederTrx);
  const userTrx = context.components.get(UserTrx);
  const queryUtil = context.components.get(QueryUtil);

  await schema.build("all");

  const adminUserLogin = "seeder_content";
  const adminUser = `${adminUserLogin}@example.com`;

  // site seeder needs admin user
  const userId = await userTrx.upsert({
    role: "administrator",
    user_email: adminUser,
    user_login: adminUserLogin,
  });

  // populate options
  await seederTrx.populateOptions({
    siteUrl: helpers.siteUrl,
  });

  await seederTrx.populateContent(userId);

  const posts = await queryUtil.posts(() => {});

  if (!posts) {
    expect(false).toBe(true);
  } else {
    expect(posts.length).toBe(3);
  }

  const comments = await queryUtil.comments(() => {});
  expect(comments && comments.length > 0).toBe(true);

  await helpers.dropDatabase(dbName);
});
