import Application from "@rnaga/wp-node/application";
import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("meta get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const meta = await Clis.executeCommand([
    "",
    "",
    "meta",
    "get",
    "post",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(meta).not.toBeUndefined();
});

test("meta list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const result = await Clis.executeCommand([
    "",
    "",
    "meta",
    "list",
    "post",
    "-P",
    "5",
    "--configJson",
    configJson,
  ]);

  expect(result.data.length).toBeGreaterThan(0);
});

test("meta upsert and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const context = await Application.getContext("multi");
  const { superAdmin } = await helpers.getTestUsers(context);

  const random = Math.floor(Math.random() * 100000);
  const metaKey = `___test-meta-cli-upsert-${random}`;

  // Create a meta
  let result = await Clis.executeCommand([
    "",
    "",
    "meta",
    "upsert",
    "post",
    "-i",
    "1",
    "-k",
    metaKey,
    "-v",
    "test",
    "-a",
    `${superAdmin.props?.ID}`,
    "--configJson",
    configJson,
  ]);

  expect(result.data).toBe(true);

  // Delete the meta
  result = await Clis.executeCommand([
    "",
    "",
    "meta",
    "delete",
    "post",
    "-i",
    "1",
    "-k",
    "-a",
    `${superAdmin.props?.ID}`,
    metaKey,
    "--configJson",
    configJson,
  ]);

  expect(result.data).not.toBeUndefined();
});
