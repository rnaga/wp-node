import Application from "@rnaga/wp-node/application";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { getTestUsers } from "../../../helpers";

test("create", async () => {
  const context = await Application.getContext("multi");
  const userCrud = context.components.get(UserCrud);
  const userUtil = context.components.get(UserUtil);

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `__user_crud_create_${random}`;
  const userEmail = `${userLogin}@test.com`;
  const result = await userCrud.create({
    user_login: userLogin,
    user_email: userEmail,
    user_pass: "1234",
    role: "author",
  });

  const newUser = await userUtil.get(result.data.ID);
  const newRole = await newUser.role();
  expect(newRole.names.has("author")).toBe(true);
});
