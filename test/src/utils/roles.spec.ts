import Application from "@rnaga/wp-node/application";
import { RolesUtil } from "@rnaga/wp-node/core/utils/roles.util";

test("get", async () => {
  let context = await Application.getContext("multi");
  let rolesUtil = context.components.get(RolesUtil);

  let roles = await rolesUtil.get(1);

  expect(roles.superadmin.capabilities.includes("manage_network_users")).toBe(
    true
  );

  context = await Application.getContext("single");
  rolesUtil = context.components.get(RolesUtil);

  roles = await rolesUtil.get(1);

  expect(roles.administrator.capabilities.includes("manage_options")).toBe(
    true
  );
});

test("getSuperAdmins", async () => {
  let context = await Application.getContext("multi");
  let rolesUtil = context.components.get(RolesUtil);

  let superAdmins = await rolesUtil.getSuperAdmins({ blogId: 1 });
  expect(superAdmins.includes("wp-multi")).toBe(true);

  context = await Application.getContext("single");
  rolesUtil = context.components.get(RolesUtil);

  superAdmins = await rolesUtil.getSuperAdmins({ blogId: 1 });

  expect(superAdmins.length).toBe(0);
});

test("count", async () => {
  const context = await Application.getContext("multi");
  const rolesUtil = context.components.get(RolesUtil);

  const roles = await rolesUtil.count(1);

  expect(Object.keys(roles).length > 0).toBe(true);
});
