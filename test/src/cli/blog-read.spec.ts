import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("blog get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const blog = await Clis.executeCommand([
    "",
    "",
    "blog",
    "get",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(blog.blog_id).toBe(1);
});

test("blog list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const blogs = await Clis.executeCommand([
    "",
    "",
    "blog",
    "list",
    "--configJson",
    configJson,
  ]);

  expect(blogs.data.length).toBeGreaterThan(0);
});
