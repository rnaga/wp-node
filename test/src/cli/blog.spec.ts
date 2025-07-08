import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";
import { cliInstall } from "./helpers";

test("blog create, update and delete", async () => {
  const dbName = "wptest-cli-blog";

  // Create a test database
  await helpers.createDatabase(dbName);
  await cliInstall("multi", dbName);

  const configJson = JSON.stringify(helpers.getCliConfig("multi", dbName));

  const random = Math.floor(Math.random() * 100000);

  // Create a blog
  const blog = await Clis.executeCommand([
    "",
    "",
    "blog",
    "create",
    "--title",
    `testcli${random}`,
    "--domain",
    `localhost${random}`,
    "--path",
    "/test-blog",
    "--configJson",
    configJson,
  ]);

  expect(blog.data).toBeGreaterThan(0);
  const blogId = blog.data;

  // Update the blog
  const updatedBlog = await Clis.executeCommand([
    "",
    "",
    "blog",
    "update",
    blogId,
    "--path",
    "/test-blog-updated",
    "--configJson",
    configJson,
  ]);

  expect(updatedBlog.data).toBeTruthy();

  // Update flag
  const updatedBlogFlag = await Clis.executeCommand([
    "",
    "",
    "blog",
    "flag",
    blogId,
    "public",
    "off",
    "--configJson",
    configJson,
  ]);

  expect(updatedBlogFlag.data).toBeTruthy();

  // Delete the blog
  const deletedBlog = await Clis.executeCommand([
    "",
    "",
    "blog",
    "delete",
    blogId,
    "--yes",
    "--configJson",
    configJson,
  ]);

  expect(deletedBlog.data).not.toBeUndefined();

  await helpers.dropDatabase(dbName);
});
