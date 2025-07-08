import Application from "@rnaga/wp-node/application";
import { Role } from "@rnaga/wp-node/core/role";
import { Roles } from "@rnaga/wp-node/core/roles";

test("default roles", async () => {
  const context = await Application.getContext("single");

  const roles = context.components.get(Roles);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const names = Object.entries(roles.all).map(([v, k]) => v);

  expect(names).toEqual([
    "administrator",
    "editor",
    "author",
    "contributor",
    "subscriber",
    "anonymous",
  ]);

  const admin = roles.get("administrator");
  const role = context.components.get(Role, [admin?.name, admin?.capabilities]);

  expect(await role.can("edit_users", 1, 2)).toBe(true);
});

test("current user roles", async () => {
  let context = await Application.getContext("single");
  let userRoles = context.vars.USER_ROLES;

  expect(typeof userRoles["administrator"]).toBe("object");

  context = await Application.getContext("multi");
  userRoles = context.vars.USER_ROLES;

  expect(typeof userRoles["administrator"]).toBe("object");
  expect(typeof userRoles["superadmin"]).toBe("object");
});
