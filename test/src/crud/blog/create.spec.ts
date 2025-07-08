import Application from "@rnaga/wp-node/application";
import { Config } from "@rnaga/wp-node/config";
import { BlogCrud } from "@rnaga/wp-node/crud/blog.crud";
import { BlogTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("create", async () => {
  const context = await Application.getContext("multi");
  const blogTrx = context.components.get(BlogTrx);
  const blogCrud = context.components.get(BlogCrud);
  const { superAdmin } = await getTestUsers(context);
  const config = context.components.get(Config);

  await context.current.assumeUser(superAdmin);

  // Invalid input

  await expect(
    blogCrud.create({
      domain: "___invalid___",
      title: "title",
      path: "/",
    })
  ).rejects.toThrow();

  config.config.multisite.subdomainInstall = false;
  // With reserved subdirectory
  await expect(
    blogCrud.create({
      domain: "wp-admin",
      title: "title",
      path: "/",
    })
  ).rejects.toThrow();

  // subdomainInstall is enabled
  config.config.multisite.subdomainInstall = true;
  const domain = "newdomain";
  const result1 = await blogCrud.create({
    domain,
    title: "title",
    path: "/path",
  });

  const blog1 = (await blogCrud.get(result1.data)).data;
  expect(blog1.domain).toBe(
    `${domain}.${context.current.site?.props.site.domain}`
  );

  await blogTrx.remove(blog1.blog_id);

  config.config.multisite.subdomainInstall = false;

  const result2 = await blogCrud.create({
    domain: "newdomain",
    title: "title",
    path: "/path",
  });

  const blog2 = (await blogCrud.get(result2.data)).data;
  expect(blog2.domain).toBe(context.current.site?.props.site.domain);

  await blogTrx.remove(blog2.blog_id);
  config.config.multisite.subdomainInstall = true;
});
