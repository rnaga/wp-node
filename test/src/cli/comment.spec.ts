import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("comment get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const comment = await Clis.executeCommand([
    "",
    "",
    "comment",
    "get",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(comment.props.comment_ID).toBe(1);
});

test("comment list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const comments = await Clis.executeCommand([
    "",
    "",
    "comment",
    "list",
    "-P",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(comments.data.length).toBeGreaterThan(0);
});

test("comment create, update and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  // Create a post
  const post = await Clis.executeCommand([
    "",
    "",
    "post",
    "create",
    "--title",
    "Test post",
    "--postStatus",
    "publish",
    "--content",
    "Test post content",
    "--configJson",
    configJson,
  ]);

  const postId = post.data;

  const create = await Clis.executeCommand([
    "",
    "",
    "comment",
    "create",
    "--postId",
    `${postId}`,
    "--content",
    "Test comment",
    "--author",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(create.data).toBeGreaterThan(0);
  const commentId = create.data;

  const update = await Clis.executeCommand([
    "",
    "",
    "comment",
    "update",
    `${commentId}`,
    "--content",
    "Test comment updated",
    "--configJson",
    configJson,
  ]);

  expect(update.data).toBeGreaterThan(0);

  const del = await Clis.executeCommand([
    "",
    "",
    "comment",
    "delete",
    `${commentId}`,
    "--force",
    "--configJson",
    configJson,
  ]);

  expect(del.data).toBe(true);
});
