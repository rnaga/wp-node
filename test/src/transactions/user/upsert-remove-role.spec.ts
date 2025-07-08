import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import Database from "@rnaga/wp-node/database";
import { UserTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";

const dataSchema = val.database.wpUsers.omit({
  ID: true,
  deleted: true,
  spam: true,
  user_registered: true,
  user_status: true,
  user_url: true,
});

test("upsert and remove role", async () => {
  const context = await Application.getContext("single");
  const database = context.components.get(Database);
  const userUtil = context.components.get(UserUtil);
  const userTrx = context.components.get(UserTrx);

  const random = Math.floor(Math.random() * 1000);
  const data: z.infer<typeof dataSchema> = {
    display_name: `__${random}`,
    user_activation_key: "",
    user_email: `upsert-role-test${random}@test.com`,
    user_login: `upsert_role_test_${random}`,
    user_nicename: `__${random}`,
    user_pass: "__",
  };

  const trx = await database.transaction;
  const current = context.components.get(Current);

  let userId = 0;
  await trx
    .insert(data)
    .into(current.tables.get("users"))
    .then((v) => {
      console.log("user", v);
      userId = v[0];
    });
  await trx.commit();

  console.log(`User Id - ${userId}`);

  // Insert
  await userTrx.upsertRole(userId, "administrator");
  let user = await userUtil.get(userId);
  let role = await user.role();
  expect(role.isAdmin()).toBe(true);

  // Update
  await userTrx.upsertRole(userId, "subscriber");
  user = await userUtil.get(userId);
  role = await user.role();
  expect(role.is("subscriber")).toBe(true);

  // Remove
  await userTrx.removeRole(userId);
  user = await userUtil.get(userId);
  role = await user.role();
  expect(role.is("anonymous")).toBe(true);
});
