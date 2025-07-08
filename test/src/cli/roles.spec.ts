import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("role get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const result = await Clis.executeCommand([
    "",
    "",
    "role",
    "get",
    "administrator",
    "--configJson",
    configJson,
  ]);

  expect(result).not.toBeUndefined();
});

test("role list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const result = await Clis.executeCommand([
    "",
    "",
    "role",
    "list",
    "--configJson",
    configJson,
  ]);

  expect(result.data.length).toBeGreaterThan(0);
});

test("role create, update and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const random = Math.floor(Math.random() * 100000);
  const role = `test_role_${random}`;

  // Create a role
  let result = await Clis.executeCommand([
    "",
    "",
    "role",
    "create",
    role,
    "-n",
    `Test Role - ${random}`,
    "--configJson",
    configJson,
  ]);

  expect(result.data).not.toBeUndefined();

  // Update the role
  result = await Clis.executeCommand([
    "",
    "",
    "role",
    "update",
    role,
    "-n",
    `Test Role - ${random} - updated`,
    "--configJson",
    configJson,
  ]);

  expect(result).not.toBeUndefined();

  // Delete the role
  result = await Clis.executeCommand([
    "",
    "",
    "role",
    "delete",
    role,
    "--configJson",
    configJson,
  ]);

  expect(result.data).not.toBeUndefined();
});
