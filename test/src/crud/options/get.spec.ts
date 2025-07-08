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
