import Application from "@rnaga/wp-node/application";
import { OptionsCrud } from "@rnaga/wp-node/crud/options.crud";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("multi");
  const optionsCrud = context.components.get(OptionsCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const options = await optionsCrud.get(undefined, { blogId: 2 });

  const adminEmail = `test_options_crud_update_${Math.floor(
    Math.random() * 10000
  )}@test.com`;

  await optionsCrud.update(
    {
      admin_email: adminEmail,
    },
    { blogId: 2 }
  );

  const updated = await optionsCrud.get(undefined, { blogId: 2 });
  await optionsCrud.update(
    {
      admin_email: options.data.admin_email,
    },
    { blogId: 2 }
  );

  expect(updated.data.admin_email).toBe(adminEmail);
});
