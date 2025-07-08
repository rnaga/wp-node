import Application from "@rnaga/wp-node/application";
import { SettingsCrud } from "@rnaga/wp-node/crud/settings.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("multi");
  const settingsCrud = context.components.get(SettingsCrud);

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const settings = await settingsCrud.get();

  console.log(settings);
});
