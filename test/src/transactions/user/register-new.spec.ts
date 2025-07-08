import Application from "@rnaga/wp-node/application";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { UserTrx } from "@rnaga/wp-node/transactions";

test("register new user", async () => {
  const context = await Application.getContext("single");
  const userTrx = context.components.get(UserTrx);
  const userUtil = context.components.get(UserUtil);
  const random = Math.floor(Math.random() * 10000);

  const userLogin = `test_user_register_new_${random}`;
  const email = `${userLogin}@test.com`;
  const userId = await userTrx.registerNew(userLogin, email);

  const user = await userUtil.get(userId);
  expect(user.props?.ID).toBe(userId);
  expect(user.props?.user_login).toBe(userLogin);
  expect(user.props?.user_email).toBe(email);
});
