import Application from "@rnaga/wp-node/application";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { getTestUsers } from "../../../helpers";

test("getBlogs - multisite", async () => {
  const context = await Application.getContext("multi");
  const userCrud = context.components.get(UserCrud);

  const { superAdmin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const blogs = await userCrud.getBlogs(subscriber.props?.ID as number);
  expect(Array.isArray(blogs.data)).toBe(true);

  await context.current.assumeUser(subscriber);

  await expect(
    userCrud.getBlogs(subscriber.props?.ID as number)
  ).rejects.toThrow();
});

test("getBlogs - single site", async () => {
  const context = await Application.getContext("single");
  const userCrud = context.components.get(UserCrud);

  const { admin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const blogs = await userCrud.getBlogs(subscriber.props?.ID as number);
  expect(blogs.data.length > 0).toBe(true);

  await context.current.assumeUser(subscriber);

  await expect(
    userCrud.getBlogs(subscriber.props?.ID as number)
  ).rejects.toThrow();
});
