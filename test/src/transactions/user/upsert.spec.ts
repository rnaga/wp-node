import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { UserTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";

test("defaults", async () => {
  const data: Partial<z.infer<typeof val.trx.userUpsert>> = {
    user_email: "test@test.com",
    user_login: "testupsert",
    role: "editor",
  };
  const defaults = val.trx.userUpsert.parse(data);
  //expect(defaults.comment_status).toBe("open");
  console.log(defaults);
});

test("upsert", async () => {
  const context = await Application.getContext("single");
  const userTrx = context.components.get(UserTrx);

  const random = Math.floor(Math.random() * 100000);
  const input: Partial<z.infer<typeof val.trx.userUpsert>> = {
    //ID: 36,
    user_email: `testtest4${random}@test.com`,
    user_pass: "123456",
    user_login: `___user_login_4_${random}`,
    show_admin_bar_front: "false",
    role: "author",
  };

  await userTrx.upsert(input);
});
