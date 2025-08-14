import Application from "@rnaga/wp-node/application";
import { OptionsCrud } from "@rnaga/wp-node/crud/options.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("multi");
  const optionsCrud = context.components.get(OptionsCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const result1 = await optionsCrud.get(undefined, { blogId: 2 });
  expect(result1.data.timezone_string).not.toBe(undefined);

  const result2 = await optionsCrud.get("discussion");
  expect(result2.data.avatar_default).not.toBe(undefined);
});

test("get single site", async () => {
  const context = await Application.getContext("single");
  const optionsCrud = context.components.get(OptionsCrud);
  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const result1 = await optionsCrud.get(undefined);
  expect(result1.data.timezone_string).not.toBe(undefined);

  const result2 = await optionsCrud.get("general");

  // Check if the options are available for single site
  expect(result2.data.users_can_register).not.toBe(undefined);
  expect(result2.data.default_role).not.toBe(undefined);
});
