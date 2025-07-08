import Application from "@rnaga/wp-node/application";
import * as helpers from "../../helpers";
import { SchemaBuilder } from "@rnaga/wp-node/schema-builder/schema-builder";

test("single site - create and update table", async () => {
  const dbName = "wptest-create-test-single";
  const testAppName = "create_db_test_single";

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
  const schemaBuilder = context.components.get(SchemaBuilder);

  // Check for users table
  const builders = await schemaBuilder.get("users");

  for (const builder of builders) {
    console.log(builder.toString());
    await builder;
  }

  // The following columns don't exist in single site
  expect(await helpers.columnExists(dbName, "wp_users", "spam")).toBe(false);
  expect(await helpers.columnExists(dbName, "wp_users", "deleted")).toBe(false);

  await helpers.dropDatabase(dbName);
});

test("multi site - create and update table", async () => {
  const dbName = "wptest-create-test";
  const testAppName = "create_db_test";

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
  const schemaBuilder = context.components.get(SchemaBuilder);

  let builders = await schemaBuilder.get("blogs");

  expect(builders.length > 0).toBe(true);

  for (const builder of builders) {
    await builder;
  }

  // Check for alter table
  await helpers.dropColumn(dbName, "wp_blogs", "lang_id");
  expect(await helpers.columnExists(dbName, "wp_blogs", "lang_id")).toBe(false);

  builders = await schemaBuilder.get("blogs");

  expect(builders.length > 0).toBe(true);

  console.log(builders.toString());

  for (const builder of builders) {
    await builder;
  }

  expect(await helpers.columnExists(dbName, "wp_blogs", "lang_id")).toBe(true);

  // Check for users table
  builders = await schemaBuilder.get("users");

  for (const builder of builders) {
    console.log(builder.toString());
    await builder;
  }

  expect(await helpers.columnExists(dbName, "wp_users", "spam")).toBe(true);
  expect(await helpers.columnExists(dbName, "wp_users", "deleted")).toBe(true);

  await helpers.dropDatabase(dbName);
});
