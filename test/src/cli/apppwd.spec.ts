import { Clis } from "@rnaga/wp-node-cli/clis";
import Application from "@rnaga/wp-node/application";
import { UserTrx } from "@rnaga/wp-node/transactions";

import * as helpers from "../../helpers";

test("apppwd create, list, update and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const context = await Application.getContext("multi");
  const userTrx = context.components.get(UserTrx);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `___test-user-cli-apppwd-${random}`;

  const userId = await userTrx.upsert({
    user_email: `${userLogin}@test.com`,
    user_pass: "123456",
    user_login: userLogin,
    role: "superadmin",
  });

  expect(userId).not.toBeUndefined();

  // Create application password
  const createResult = await Clis.executeCommand([
    "",
    "",
    "apppwd",
    "create",
    `${userId}`,
    "Test App Password",
    "--configJson",
    configJson,
  ]);

  const uuid = createResult?.data?.item.uuid;

  const listResult = await Clis.executeCommand([
    "",
    "",
    "apppwd",
    "list",
    `${userId}`,
    "--configJson",
    configJson,
  ]);

  expect(listResult.length).toBeGreaterThan(0);

  const updateResult = await Clis.executeCommand([
    "",
    "",
    "apppwd",
    "update",
    `${userId}`,
    `${uuid}`,
    "Updated App Password Name",
    "--configJson",
    configJson,
  ]);

  expect(updateResult.data).toBe(true);

  console.log("Update Result:", updateResult);

  const deleteResult = await Clis.executeCommand([
    "",
    "",
    "apppwd",
    "delete",
    `${userId}`,
    `${uuid}`,
    "--configJson",
    configJson,
  ]);

  console.log("Delete Result:", deleteResult);
  expect(deleteResult.data).toBe(true);

  await userTrx.remove(userId);
});
