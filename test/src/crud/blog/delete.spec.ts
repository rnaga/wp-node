import Application from "@rnaga/wp-node/application";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { BlogCrud } from "@rnaga/wp-node/crud/blog.crud";
import { getTestUsers } from "../../../helpers";

test("delete", async () => {
  const context = await Application.getContext("multi");
  const blogCrud = context.components.get(BlogCrud);
  const blogUtil = context.components.get(BlogUtil);

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const mainBlogId = await blogUtil.getMainBlogId();

  // Can't delete the main blog
  await expect(blogCrud.delete(mainBlogId)).rejects.toThrow(
    "Error: Can't delete the main blog"
  );

  const newBlogId = (
    await blogCrud.create({
      domain: "newdomain",
      title: "title",
      path: "/path",
    })
  ).data;

  const result = await blogCrud.delete(newBlogId);
  if (!result.data?.blog_id) {
    expect(false).toBe(true);
  } else {
    const blog = await blogUtil.get(result.data.blog_id);
    expect(blog.props).toBe(undefined);
  }
});
