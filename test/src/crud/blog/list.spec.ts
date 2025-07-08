import Application from "@rnaga/wp-node/application";
import { BlogCrud } from "@rnaga/wp-node/crud/blog.crud";
import { getTestUsers } from "../../../helpers";

test("list", async () => {
  const context = await Application.getContext("multi");
  const blogCrud = context.components.get(BlogCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const blogs = await blogCrud.list({
    search: "localhost",
    spam: 0,
    public: 1,
    //page: 2,
  });

  expect(blogs.data.length > 0).toBe(true);
  expect(blogs.data?.[0].blogname).not.toBe(undefined);
  expect(blogs.data?.[0].url).not.toBe(undefined);
});
