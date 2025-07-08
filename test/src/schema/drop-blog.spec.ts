import Application from "@rnaga/wp-node/application";
import { Schema } from "@rnaga/wp-node/core/schema";
import * as helpers from "../../helpers";

test("multi site - build tables", async () => {
  const dbName = "wptest-schema-test-drop-blog-multi";
  const testAppName = "schem_test_drop_blog_multi";

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
  await schema.dropBlog(99);

  expect(await helpers.tableExists(dbName, "wp_99_posts")).toBe(false);

  await helpers.dropDatabase(dbName);
});
