import Application from "@rnaga/wp-node/application";
import { SettingsCrud } from "@rnaga/wp-node/crud/settings.crud";
import { OptionsTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("multi");
  const optionsTrx = context.components.get(OptionsTrx);
  const settingsCrud = context.components.get(SettingsCrud);

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const originalSettings = await settingsCrud.get();

  const random = Math.floor(Math.random() * 100000);
  const description = `option_crud_update_${random}`;
  const email = `${description}@test.com`;

  await settingsCrud.update({
    description,
    email,
  });

  const settings = await settingsCrud.get();
  expect(settings.data.email).toBe(email);
  expect(settings.data.description).toBe(description);

  await optionsTrx.insert(
    "blogdescription",
    originalSettings.data.title as string
  );
  await optionsTrx.insert("admin_email", originalSettings.data.email as string);
});
