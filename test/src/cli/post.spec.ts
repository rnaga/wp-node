import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("post get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const post = await Clis.executeCommand([
    "",
    "",
    "post",
    "get",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(post.props.ID).toBe(1);
});

test("post list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const result = await Clis.executeCommand([
    "",
    "",
    "post",
    "list",
    "--configJson",
    configJson,
  ]);

  expect(result.data.length).toBeGreaterThan(0);
});

test("post create, update and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const random = Math.floor(Math.random() * 100000);

  // Create a post
  let result = await Clis.executeCommand([
    "",
    "",
    "post",
    "create",
    "-t",
    `Test post - ${random}`,
    "-C",
    "Test content",
    "--configJson",
    configJson,
  ]);

  expect(result.data).toBeGreaterThan(0);
  const postId = result.data;

  // Update the post
  result = await Clis.executeCommand([
    "",
    "",
    "post",
    "update",
    `${postId}`,
    "-t",
    `Test post - ${random} - updated`,
    "-C",
    "Test content - updated",
    "--configJson",
    configJson,
  ]);

  expect(result.data).toBeGreaterThan(0);

  // Delete the post
  result = await Clis.executeCommand([
    "",
    "",
    "post",
    "delete",
    `${postId}`,
    "--configJson",
    configJson,
  ]);

  expect(result.data).toBe(true);
});
