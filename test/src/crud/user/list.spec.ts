import Application from "@rnaga/wp-node/application";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { getTestUsers } from "../../../helpers";

test("list", async () => {
  const context = await Application.getContext("multi");
  const userCrud = context.components.get(UserCrud);

  const { superAdmin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(subscriber);

  await expect(userCrud.list({ roles: ["author"] })).rejects.toThrow();

  await expect(userCrud.list({}, { context: "edit" })).rejects.toThrow();

  await context.current.assumeUser(superAdmin);

  const superAdmins = await userCrud.list({
    superadmins: true,
    site_id: 1,
  });

  expect(
    superAdmins.data.filter((user) => user.display_name == "wp-multi").length >
      0
  ).toBe(true);
});
