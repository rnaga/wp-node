import Application from "@rnaga/wp-node/application";
import { Schema } from "@rnaga/wp-node/core/schema";
import * as helpers from "../../helpers";

test("multi site - build tables", async () => {
  const dbName = "wptest-schema-test-multi";
  const testAppName = "schem_test_multi";

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

  await schema.build("all");

  // create a new blog
  schema.usingBlog(99);

  await schema.build("blog");

  expect(await helpers.tableExists(dbName, "wp_posts")).toBe(true);
  expect(await helpers.columnExists(dbName, "wp_posts", "ID")).toBe(true);

  expect(await helpers.tableExists(dbName, "wp_99_posts")).toBe(true);
  expect(await helpers.columnExists(dbName, "wp_99_posts", "ID")).toBe(true);

  await helpers.dropDatabase(dbName);
});
