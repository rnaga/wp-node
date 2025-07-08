import Application from "@rnaga/wp-node/application";
import { RolesCrud } from "@rnaga/wp-node/crud/roles.crud";
import { getTestUsers } from "../../../helpers";

test("count - multisite", async () => {
  const context = await Application.getContext("multi");
  const rolesCrud = context.components.get(RolesCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const counts = await rolesCrud.count({ site_id: 1 });

  expect(counts.data).not.toBe(undefined);
});

test("count - single site", async () => {
  const context = await Application.getContext("single");
  const rolesCrud = context.components.get(RolesCrud);
  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const counts = await rolesCrud.count({ site_id: 1 });

  expect(counts.data).not.toBe(undefined);
});
