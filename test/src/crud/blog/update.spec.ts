import Application from "@rnaga/wp-node/application";
import { Options } from "@rnaga/wp-node/core/options";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { BlogCrud } from "@rnaga/wp-node/crud/blog.crud";
import { BlogTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("multi");
  const blogCrud = context.components.get(BlogCrud);
  const blogTrx = context.components.get(BlogTrx);
  const blogUtil = context.components.get(BlogUtil);

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const mainBlogId = await blogUtil.getMainBlogId();
  const mainBlog = (await blogCrud.get(mainBlogId)).data;

  // Can't change domain / path for main blog
  await blogCrud.update(mainBlogId, {
    ...mainBlog,
    domain: "___new_domain___",
    path: "/new_path_____",
  });

  const updatedMainBlog = (await blogCrud.get(mainBlogId)).data;
  expect(updatedMainBlog.domain).toBe(mainBlog.domain);
  expect(updatedMainBlog.path).toBe(mainBlog.path);

  const path = "/path";
  const domain = "localhost";

  const newBlogId = await blogTrx.upsert({
    site_id: 1,
    user_id: 1,
    title: "title",
    path,
    domain,
  });

  const newBlog = (await blogCrud.get(newBlogId)).data;

  await blogCrud.update(
    newBlogId,
    {
      ...newBlog,
      domain: `${domain}_updated`,
      path: `${path}_updated`,
      spam: 1,
    },
    {
      settings: { title: "title_updated", email: "newmeail@test.com" },
    }
  );

  const updatedNewBlog = (await blogCrud.get(newBlogId)).data;

  expect(updatedNewBlog.domain).not.toBe(newBlog.domain);
  expect(updatedNewBlog.path).not.toBe(newBlog.path);
  expect(updatedNewBlog.spam).not.toBe(newBlog.spam);

  await context.current.switchBlog(newBlogId);

  const options = context.components.get(Options);
  const blogname = await options.get("blogname");
  const email = await options.get("admin_email");
  expect(blogname).toBe("title_updated");
  expect(email).toBe("newmeail@test.com");

  await blogTrx.remove(newBlogId);
});
