import Application from "@rnaga/wp-node/application";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("single");
  const userCrud = context.components.get(UserCrud);

  const { admin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  let user = await userCrud.get(1);
  expect(user.data.ID).toBe(1);

  user = await userCrud.get();
  expect(admin.props?.ID).toBe(user.data.ID);

  await context.current.assumeUser(subscriber);

  await expect(userCrud.get(1)).rejects.toThrow();

  user = await userCrud.get();
  expect(subscriber.props?.ID).toBe(user.data.ID);
});

test("getAsUpsert", async () => {
  const context = await Application.getContext("single");
  const userCrud = context.components.get(UserCrud);

  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const user = await userCrud.getAsUpsert(1);
  expect(user.data.ID).toBe(1);
  expect(typeof user.data.meta_input).toBe("object");
});
