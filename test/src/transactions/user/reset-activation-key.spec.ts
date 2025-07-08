import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { UserTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";

test("cerate reset key to reset password", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);
  const userTrx = context.components.get(UserTrx);
  const random = Math.floor(Math.random() * 10000);

  const input: Partial<z.infer<typeof val.trx.userUpsert>> = {
    user_email: `reset_password_${random}@test.com`,
    user_pass: "123456",
    user_login: `___user_reset_password_${random}`,
    show_admin_bar_front: "false",
    role: "administrator",
  };

  const userId = await userTrx.upsert(input);
  let user = await userUtil.get(userId);
  await userTrx.resetActivationKey(user);
  user = await userUtil.get(userId);

  expect((user.props?.user_activation_key ?? "").length > 0).toBe(true);
});
