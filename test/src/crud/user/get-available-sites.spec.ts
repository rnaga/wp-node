import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
import { BlogTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("getAvailableSites - multisite", async () => {
  const dbName = "wptest-user-get-current-sites-crud-test-multi";
  const testAppName = "user_get_current_sites_crud_test_multi";

  // Create a test database
  await helpers.createDatabase(dbName);

  Application.configs = {
    ...helpers.getBaseAppConfig(),
    ...helpers.getAppConfig({
      appName: testAppName,
      isMulti: true,
      database: {
        user: "root",
        password: "root",
        database: dbName,
      },
    }),
  };

  const context = await Application.getContext(testAppName);

  const blogTrx = context.components.get(BlogTrx);
  const userTrx = context.components.get(UserTrx);
  const installer = context.components.get(Installer);

  const random = Math.floor(Math.random() * 100000);

  const userName = "__user_get_current_sites__crud_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "user_get_current_sites_crud_sitename";

  const { userId: siteUserId } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  // Initialize site and create a primary blog
  const firstSiteId = await installer.initializeSite(
    {
      domain,
      email: userEmail,
      siteName,
      path: "/site",
    },
    {
      subdomainInstall: true,
    }
  );

  const firstBlogIds: number[] = [];

  for (let i = 0; i <= 1; i++) {
    firstBlogIds.push(
      await blogTrx.upsert({
        site_id: firstSiteId,
        user_id: siteUserId,
        path: `/user_get_sites_crud_${i}_${random}`,
        domain: "localhost",
      })
    );
  }

  const secondSiteId = await installer.initializeSite(
    {
      domain,
      email: userEmail,
      siteName,
      path: "/site_2",
    },
    {
      subdomainInstall: true,
    }
  );
  const secondBlogIds: number[] = [];

  for (let i = 0; i <= 1; i++) {
    secondBlogIds.push(
      await blogTrx.upsert({
        site_id: secondSiteId,
        user_id: siteUserId,
        path: `/user_2_get_sites_crud_${i}_${random}`,
        domain: "localhost2",
      })
    );
  }

  // Add users
  const users = [];
  for (let i = 0; i <= 2; i++) {
    const userLogin = `user_get_current_sites_crud_list_${i}_${random}`;
    users.push(
      await userTrx.upsert(
        {
          user_email: `user_crud_list_${i}_${random}@test.com`,
          user_pass: "123456",
          user_login: userLogin,
        },
        {
          attachRole: false,
        }
      )
    );
  }

  const userId1 = users[0];
  const userId2 = users[1];

  // Add roles
  await blogTrx.addUser(firstBlogIds[0], userId1, "administrator");
  await blogTrx.addUser(firstBlogIds[1], userId1, "editor");
  await blogTrx.addUser(secondBlogIds[0], userId1, "author");
  await blogTrx.addUser(secondBlogIds[1], userId1, "author");

  await blogTrx.addUser(firstBlogIds[0], userId2, "administrator");
  await blogTrx.addUser(firstBlogIds[1], userId2, "administrator");
  await blogTrx.addUser(secondBlogIds[0], userId2, "administrator");
  await blogTrx.addUser(secondBlogIds[1], userId2, "administrator");

  const userCrud = context.components.get(UserCrud);

  // First user has one admin role in 1st site & 1st blog
  await context.current.assumeUser(userId1);
  const availableSites1 = (await userCrud.getAvailableSites()).data;

  expect(availableSites1.sites?.length).toBe(2);
  const blogs1 = availableSites1.sites?.flatMap((site) => site.blogs);
  expect(blogs1?.length).toBe(4);

  // first blog in fitst site
  const firstBlog10 = blogs1?.filter(
    (blog) => blog?.blog_id === firstBlogIds[0] && blog?.site_id == firstSiteId
  );

  expect(firstBlog10?.[0]?.rolenames?.includes("administrator")).toBe(true);
  expect(firstBlog10?.[0]?.capabilities.includes("list_blog_users")).toBe(true);

  // second blog in second site
  const secondBlog10 = blogs1?.filter(
    (blog) =>
      blog?.blog_id === secondBlogIds[0] && blog?.site_id == secondSiteId
  );
  expect(secondBlog10?.[0]?.rolenames?.includes("author")).toBe(true);

  // Second user has admin role in all sites and blogs
  await context.current.assumeUser(userId2);

  const availableSites2 = (await userCrud.getAvailableSites()).data;
  const blogs2 = availableSites2.sites?.flatMap((site) => site.blogs);
  expect(blogs2?.length).toBe(4);

  const coundAdmins = blogs2?.filter((blog) =>
    blog?.rolenames?.includes("administrator")
  );
  expect(coundAdmins?.length).toBe(4);

  await helpers.dropDatabase(dbName);
});
