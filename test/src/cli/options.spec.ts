import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("option get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const option = await Clis.executeCommand([
    "",
    "",
    "option",
    "get",
    "siteurl",
    "--configJson",
    configJson,
  ]);

  expect(option).not.toBeUndefined();
});

test("option list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const result = await Clis.executeCommand([
    "",
    "",
    "option",
    "list",
    "-l",
    "5",
    "--configJson",
    configJson,
  ]);

  expect(result.length).toBeGreaterThan(0);
});

test("option upsert and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const random = Math.floor(Math.random() * 100000);
  const optionName = `___test-option-cli-upsert-${random}`;

  // Upsert an option
  let result = await Clis.executeCommand([
    "",
    "",
    "option",
    "upsert",
    optionName,
    "test",
    "--configJson",
    configJson,
  ]);

  expect(result).toBeGreaterThan(0);

  // Update the option
  result = await Clis.executeCommand([
    "",
    "",
    "option",
    "upsert",
    optionName,
    "test-updated",
    "--configJson",
    configJson,
  ]);

  expect(result).toBeGreaterThan(0);

  // Delete the option
  result = await Clis.executeCommand([
    "",
    "",
    "option",
    "delete",
    optionName,
    "--configJson",
    configJson,
  ]);

  expect(result).toBe(true);
});
