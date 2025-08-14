import Application from "@rnaga/wp-node/application";
import { UserSelfRegistrationCrud } from "@rnaga/wp-node/crud/user-self-registration.crud";
import { getTestUsers } from "../../../helpers";

test("canSignup", async () => {
  const context = await Application.getContext("multi");
  const userSelfRegistrationCrud = context.components.get(
    UserSelfRegistrationCrud
  );
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const result = await userSelfRegistrationCrud.canSignup();
  expect(result.data).not.toBe(undefined);
});

test("canSignup single site", async () => {
  const context = await Application.getContext("single");
  const userSelfRegistrationCrud = context.components.get(
    UserSelfRegistrationCrud
  );
  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const result = await userSelfRegistrationCrud.canSignup();
  expect(result.data).not.toBe(undefined);
});
