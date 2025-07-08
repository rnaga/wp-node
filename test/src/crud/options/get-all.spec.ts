import Application from "@rnaga/wp-node/application";
import { OptionsCrud } from "@rnaga/wp-node/crud/options.crud";
import { getTestUsers } from "../../../helpers";

test("getAll", async () => {
  const context = await Application.getContext("multi");
  const optionsCrud = context.components.get(OptionsCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const result = await optionsCrud.getAll();
  expect(result.data.blogname).not.toBe(undefined);
  expect(result.data.timezone_string).not.toBe(undefined);
});
