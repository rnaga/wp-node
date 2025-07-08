import Application from "@rnaga/wp-node/application";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { Vars } from "@rnaga/wp-node/core/vars";

test("context with single site", async () => {
  let context = await Application.getContext("single");

  await context.current.switchSite(1);
  await context.current.assumeUser(1);

  expect(context.current.user?.props?.ID).toBe(1);
  expect(context.current.role?.names.has("administrator")).toBe(true);

  context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);
  const user = await userUtil.get(1);

  await context.current.assumeUser(user);

  expect(context.current.user?.props?.ID).toBe(1);
  expect(context.current.role?.names.has("administrator")).toBe(true);
});

test("context with multi site", async () => {
  const context = await Application.getContext("multi");

  await context.current.switchSite(1);
  await context.current.assumeUser(1);

  expect(context.current.user?.props?.ID).toBe(1);
  expect(context.current.role?.names.has("superadmin")).toBe(true);

  expect(context.current.site?.props.blog.blog_id).toBe(1);

  await context.current.setPost(1);

  expect(context.current.post?.props?.ID).toBe(1);
});

test("clone context", async () => {
  const context = await Application.getContext("multi");

  const vars = context.components.get(Vars);
  const clonedContext = await vars.CONTEXT.clone();

  await context.current.switchBlog(2);
  await context.current.assumeUser(1);
  await clonedContext.current.assumeUser(2);

  expect(clonedContext.current.blogId).not.toBe(context.current.blogId);
  expect(clonedContext.current.user?.props?.ID).not.toBe(
    context.current.user?.props?.ID
  );
});
