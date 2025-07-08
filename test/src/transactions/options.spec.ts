import Application from "@rnaga/wp-node/application";
import { Options } from "@rnaga/wp-node/core/options";
import { OptionsTrx } from "@rnaga/wp-node/transactions/options.trx";

test("insert, update and remove", async () => {
  const context = await Application.getContext("single");
  const optionsTrx = context.components.get(OptionsTrx);

  // Invalid value
  await expect(optionsTrx.update("image_default_size", 1234)).rejects.toThrow();

  // Invalid value
  await expect(optionsTrx.insert("image_default_size", 1234)).rejects.toThrow();

  try {
    await optionsTrx.insert("__unit_test", "new_value");
  } catch (e) {
    console.log(e);
  }

  const value = `value_${Math.floor(Math.random() * 1000)}`;
  await optionsTrx.update("__unit_test", value);

  let option = await context.components.get(Options).get("__unit_test");
  expect(option).toBe(value);

  // Upsert
  await optionsTrx.insert("__unit_test", `updated_${value}`);
  option = await context.components.get(Options).get("__unit_test");

  expect(option).toBe(`updated_${value}`);

  // Insert existing option
  await optionsTrx.insert("__unit_test", `updated_2_${value}`, {
    upsert: false,
  });
  option = await context.components.get(Options).get("__unit_test");
  expect(option).toBe(`updated_${value}`);

  // Remove
  await optionsTrx.remove("__unit_test");

  const options = context.components.get(Options);
  const result = await options.get("__unit_test");
  expect(result).toBe(undefined);
});
