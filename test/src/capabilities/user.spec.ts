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

test("multi - remove_user", async () => {
  await runMulti();
  const superAdminRole = await superAdmin.role();

  expect(superAdminRole.isSuperAdmin()).toBe(true);

  let result = await cap.check("remove_user", superAdmin, user.props?.ID);

  expect(result[0]).toBe("remove_users");

  result = await cap.check("remove_user", user, user.props?.ID);
  expect(result[0]).toBe(DO_NOT_ALLOW);

  result = await cap.check("remove_user", user, user2.props?.ID);
  expect(result[0]).toBe("remove_users");
});

test("promote_user & add_users", async () => {
  await runMulti();

  let result = await cap.check("promote_user", user);
  expect(result[0]).toBe("promote_users");

  result = await cap.check("add_users", user);
  expect(result[0]).toBe("promote_users");
});

test("edit_user & edit_users & manage_network_users & manage_sites & manage_options", async () => {
  await runMulti();
  let result = await cap.check("edit_user", user, user.props?.ID);
  expect(result[0]).toBe(undefined);

  result = await cap.check("edit_user", user, superAdmin.props?.ID);
  expect(result[0]).toBe(DO_NOT_ALLOW);

  result = await cap.check("edit_user", user, user2.props?.ID);
  expect(result[0]).toBe(DO_NOT_ALLOW);

  result = await cap.check("edit_user", superAdmin, user.props?.ID);
  expect(result[0]).toBe("edit_users");

  result = await cap.check("manage_network_users", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("manage_network_user", superAdmin, user.props?.ID);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("manage_blog_users", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("list_blog_users", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("manage_site_users", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("manage_sites", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("manage_options", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("delete_sites", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  result = await cap.check("create_sites", superAdmin, [1]);
  expect(result.includes(DO_NOT_ALLOW)).toBe(false);

  await runSingle();
  result = await cap.check("edit_user", user, user2.props?.ID);
  expect(result[0]).toBe("edit_users");

  result = await cap.check("manage_network_users", superAdmin);
  expect(result[0]).toBe("edit_users");

  // blogIds are ignored in single site
  result = await cap.check("manage_options", admin, [99]);
  expect(result).not.toContain(DO_NOT_ALLOW);
});

test("manage_network", async () => {
  await runMulti();
  let result = await cap.check("manage_network", user, [1]);
  expect(result).toContain(DO_NOT_ALLOW);

  result = await cap.check("manage_network", superAdmin, [1]);
  expect(result).not.toContain(DO_NOT_ALLOW);

  result = await cap.check("manage_network", superAdmin, [99]);
  expect(result).toContain(DO_NOT_ALLOW);

  await runSingle();
  result = await cap.check("manage_network", user);
  expect(result).toContain(DO_NOT_ALLOW);

  result = await cap.check("manage_network", admin);
  expect(result).not.toContain(DO_NOT_ALLOW);
});

test("edit_user & edit_users", async () => {});
