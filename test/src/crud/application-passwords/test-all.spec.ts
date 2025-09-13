import Application from "@rnaga/wp-node/application";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { ApplicationPasswordsCrud } from "@rnaga/wp-node/crud/application-passwords.crud";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";

import { getTestUsers } from "../../../helpers";

test("application passwords CRUD", async () => {
  const context = await Application.getContext("multi");
  const userCrud = context.components.get(UserCrud);
  const userUtil = context.components.get(UserUtil);
  const applicationPasswordsCrud = context.components.get(
    ApplicationPasswordsCrud
  );

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  // Create a new user for testing
  const random = Math.floor(Math.random() * 100000);
  const userLogin = `__app_password_crud_${random}`;
  const userEmail = `${userLogin}@test.com`;
  const { data: newUserData } = await userCrud.create({
    user_login: userLogin,
    user_email: userEmail,
    user_pass: "1234",
    role: "superadmin",
  });

  // convert to user object
  const newUser = await userUtil.get(newUserData.ID);

  await context.current.assumeUser(newUser);

  // Create a couple of passwords first
  await applicationPasswordsCrud.create({ name: "Test App 1" });
  await applicationPasswordsCrud.create({ name: "Test App 2" });

  // List passwords
  const passwords = await applicationPasswordsCrud.list();

  expect(passwords.data.length).toBeGreaterThanOrEqual(2);

  // Get one password, then get by uuid
  const onePassword = passwords.data[0];
  const getPassword = await applicationPasswordsCrud.get(onePassword.uuid);
  expect(getPassword.data.uuid).toBe(onePassword.uuid);

  // Update
  const updatedName = "Updated App Name";
  const resultUpdate = await applicationPasswordsCrud.update(onePassword.uuid, {
    name: updatedName,
  });
  expect(resultUpdate.data).toBe(true);

  const getPasswordAfterUpdate = await applicationPasswordsCrud.get(
    onePassword.uuid
  );
  expect(getPasswordAfterUpdate.data.name).toBe(updatedName);

  // Delete one password
  await applicationPasswordsCrud.delete(onePassword.uuid);

  // List again, should be one less
  const passwordsAfterDelete = await applicationPasswordsCrud.list();
  expect(passwordsAfterDelete.data.length).toBe(passwords.data.length - 1);

  // Delete all remaining passwords
  await applicationPasswordsCrud.deleteAll();

  // List again, should be zero
  const passwordsAfterDeleteAll = await applicationPasswordsCrud.list();
  expect(passwordsAfterDeleteAll.data.length).toBe(0);

  // Switch back to super admin
  await context.current.assumeUser(superAdmin);

  // Cleanup - delete the user
  await userCrud.delete(newUser.props!.ID);
});
