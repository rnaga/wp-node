import Application from "@rnaga/wp-node/application";
import { Clis } from "@rnaga/wp-node-cli/clis";
import { UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../helpers";

test("user get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const user = await Clis.executeCommand([
    "",
    "",
    "user",
    "get",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(user.ID).toBe(1);
});

test("user list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const result = await Clis.executeCommand([
    "",
    "",
    "user",
    "list",
    "--configJson",
    configJson,
  ]);

  expect(result.data.length).toBeGreaterThan(0);
});

test("user addRole and removeRole", async () => {
  const context = await Application.getContext("multi");
  const userTrx = context.components.get(UserTrx);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `___test-user-cli-add-role-${random}`;

  const userId = await userTrx.upsert({
    user_email: `${userLogin}@test.com`,
    user_pass: "123456",
    user_login: userLogin,
    role: "author",
  });

  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  // Add role
  let result = await Clis.executeCommand([
    "",
    "",
    "user",
    "addRole",
    `${userId}`,
    "administrator",
    "--configJson",
    configJson,
  ]);

  expect(result).toBe(true);

  // Remove role
  result = await Clis.executeCommand([
    "",
    "",
    "user",
    "removeRole",
    `${userId}`,
    "administrator",
    "--configJson",
    configJson,
  ]);

  expect(result).toBe(true);
});

test("user create, update and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const userLogin = `___test-user-cli-create-${Math.floor(
    Math.random() * 100000
  )}`;

  // Create a user
  const user = await Clis.executeCommand([
    "",
    "",
    "user",
    "create",
    "-l",
    userLogin,
    "-e",
    `${userLogin}@test.com`,
    "--configJson",
    configJson,
  ]);

  const userId = user.ID;

  expect(user.ID).toBeGreaterThan(0);

  // Update the user
  const resultUpdate = await Clis.executeCommand([
    "",
    "",
    "user",
    "update",
    `${userId}`,
    "-f",
    `name-updated`,
    "--configJson",
    configJson,
  ]);

  expect(resultUpdate.data).toBeGreaterThan(0);

  // Delete the user
  const result = await Clis.executeCommand([
    "",
    "",
    "user",
    "delete",
    `${userId}`,
    "--yes",
    "--network",
    "--configJson",
    configJson,
  ]);

  expect(result).toBe(true);
});
