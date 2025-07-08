import Application from "@rnaga/wp-node/application";
import { BlogCrud } from "@rnaga/wp-node/crud/blog.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("multi");
  const blogCrud = context.components.get(BlogCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const blog = await blogCrud.get(1);

  expect(blog.data.blog_id).toBe(1);
  expect(blog.data.settings.title).not.toBe(undefined);
});
