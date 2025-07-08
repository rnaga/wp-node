import Application from "@rnaga/wp-node/application";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("multi");
  const userCrud = context.components.get(UserCrud);
  const userUtil = context.components.get(UserUtil);

  const { superAdmin, editor } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `__user_crud_update_${random}`;
  const userEmail = `${userLogin}@test.com`;
  const result = await userCrud.create({
    user_login: userLogin,
    user_email: userEmail,
    user_pass: "1234",
    role: "author",
  });

  const userId = result.data.ID;
  const newUser = (await userCrud.getAsUpsert(result.data.ID)).data;

  // User Login is not editable
  await expect(
    userCrud.update(userId, {
      ...newUser,
      user_login: "___changed___",
    })
  ).rejects.toThrow();

  await context.current.assumeUser(editor);

  // Editor can't edit others user
  await expect(
    userCrud.update(userId, {
      ...newUser,
      role: "subscriber",
    })
  ).rejects.toThrow();

  // Switch to newUser / author
  await context.current.assumeUser(newUser.ID);

  // Author can't promote role
  await expect(
    userCrud.update(userId, {
      ...newUser,
      role: "contributor",
    })
  ).rejects.toThrow();

  const userUrl = "http://localhost_new";
  await userCrud.update(userId, {
    user_login: newUser.user_login,
    user_url: userUrl,
  });
  let user = await userUtil.get(newUser.ID ?? -1);
  expect(user.props?.user_url).toBe(userUrl);

  await context.current.assumeUser(superAdmin);

  // Can't update role via "update". Use updateRole
  await userCrud.update(userId, {
    ...newUser,
    role: "contributor",
  });
  user = await userUtil.get(newUser.ID ?? -1);
  const role = await user.role();

  expect(role.names.has("contributor")).not.toBe(true);
});
