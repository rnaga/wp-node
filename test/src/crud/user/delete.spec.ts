import Application from "@rnaga/wp-node/application";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { getTestUsers } from "../../../helpers";

test("delete - multi site", async () => {
  const context = await Application.getContext("multi");
  const userCrud = context.components.get(UserCrud);
  const userUtil = context.components.get(UserUtil);

  const { superAdmin, editor } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `__user_crud_delete_multi${random}`;
  const userEmail = `${userLogin}@test.com`;
  const result = await userCrud.create({
    user_login: userLogin,
    user_email: userEmail,
    user_pass: "1234",
    role: "author",
  });
  const newUserId = result.data.ID;

  let newUser = await userUtil.get(newUserId);
  const newRole = await newUser.role();

  expect(newRole.names.has("author")).toBe(true);

  await context.current.assumeUser(editor);

  // Editor can't delete user
  await expect(userCrud.delete(result.data.ID)).rejects.toThrow();

  // superadmin can delete
  await context.current.assumeUser(superAdmin);

  await userCrud.delete(result.data.ID, {
    reassignList: { 1: 1 },
  });
  newUser = await userUtil.get(newUserId);

  expect(newUser.props?.ID).toBe(undefined);
});

test("delete - single site", async () => {
  const context = await Application.getContext("single");
  const userCrud = context.components.get(UserCrud);
  const userUtil = context.components.get(UserUtil);

  const { admin, editor } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `__user_crud_delete_${random}`;
  const userEmail = `${userLogin}@test.com`;
  const result = await userCrud.create({
    user_login: userLogin,
    user_email: userEmail,
    user_pass: "1234",
    role: "author",
  });
  const newUserId = result.data.ID;

  let newUser = await userUtil.get(newUserId);
  const newRole = await newUser.role();

  expect(newRole.names.has("author")).toBe(true);

  await context.current.assumeUser(editor);

  // Editor can't delete user
  await expect(userCrud.delete(result.data.ID)).rejects.toThrow();

  // admin can delete
  await context.current.assumeUser(admin);

  await userCrud.delete(result.data.ID);
  newUser = await userUtil.get(newUserId);

  expect(newUser.props?.ID).toBe(undefined);
});
