import Application from "@rnaga/wp-node/application";
import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { Capabilities } from "@rnaga/wp-node/core/capabilities";
import { Context } from "@rnaga/wp-node/core/context";
import { User } from "@rnaga/wp-node/core/user";

let context: Context;
let cap: Capabilities;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let superAdmin: User, admin: User, user: User, user2: User;

const runMulti = async () => {
  context = await Application.getContext("multi");
  cap = context.components.get(Capabilities);

  superAdmin = await context.components.asyncGet(User, [1]);
  user = await context.components.asyncGet(User, [2]);
  user2 = await context.components.asyncGet(User, [3]);
};

const runSingle = async () => {
  context = await Application.getContext("single");
  cap = context.components.get(Capabilities);

  admin = await context.components.asyncGet(User, [1]);
  user = await context.components.asyncGet(User, [2]);
  user2 = await context.components.asyncGet(User, [3]);
};

test("edit_admin_roles", async () => {
  await runMulti();
  const superAdminRole = await superAdmin.role();

  expect(superAdminRole.isSuperAdmin()).toBe(true);

  let result = await cap.check("edit_admin_roles", superAdmin, 1);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  // Invalid blog id
  result = await cap.check("edit_admin_roles", superAdmin, 99);
  expect(result).toContain(DO_NOT_ALLOW);

  // non admin
  result = await cap.check("edit_admin_roles", user, 1);
  expect(result).toContain(DO_NOT_ALLOW);

  await runSingle();

  // Single site ignores blog id
  result = await cap.check("edit_admin_roles", admin, 99);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);
});
