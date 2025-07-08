import Application from "@rnaga/wp-node/application";
import { checkPassword } from "@rnaga/wp-node/common";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { getTestUsers } from "../../../helpers";

test("updatePassword", async () => {
  const context = await Application.getContext("multi");
  const userCrud = context.components.get(UserCrud);
  const userUtil = context.components.get(UserUtil);

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `__user_crud_update_password_${random}`;
  const userEmail = `${userLogin}@test.com`;
  const result = await userCrud.create({
    user_login: userLogin,
    user_email: userEmail,
    user_pass: "1234",
    role: "author",
  });

  const userId = result.data.ID;

  const newPassword = "1234_changed";
  const updateResult = await userCrud.updatePassword(userId, newPassword);

  expect(updateResult.data > 0).toBe(true);

  const user = await userUtil.get(userId);

  const passwordMatch = checkPassword(
    newPassword,
    user.props?.user_pass as string
  );

  expect(passwordMatch).toBe(true);
});
