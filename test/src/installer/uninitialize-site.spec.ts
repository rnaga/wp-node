import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { BlogTrx, SeederTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../helpers";

test("uninitialize site", async () => {
  const dbName = "wptest-uninitialize-site-test-multi";
  const testAppName = "uninitialize_site_test_multi";

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
  const installer = context.components.get(Installer);
  const blogTrx = context.components.get(BlogTrx);

  const userName = "__uninitialize_site_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "uninitialize_site_sitename";
  const seederTrx = context.components.get(SeederTrx);

  const { userId } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  // Run seeder for a new site
  await seederTrx.populateSite(
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

  // Main site can't be deleted
  await expect(installer.uninitializeSite(1)).rejects.toThrow(
    "Main site can't be uninitialized"
  );

  // Create the second site
  const secondSiteId = await installer.initializeSite(
    {
      domain: `${domain}__2`,
      email: userEmail,
      siteName: `${siteName}__2`,
      path: "/site__2",
    },
    {
      subdomainInstall: true,
    }
  );

  const blogId = await blogTrx.upsert({
    site_id: secondSiteId,
    user_id: userId,
    title: "__test__title__2",
    path: `/test_${Math.floor(Math.random() * 1000)}`,
    domain: "localhost2",
  });

  await installer.uninitializeSite(secondSiteId);

  const queryUtil = context.components.get(QueryUtil);

  const resultSite = await queryUtil.sites((query) => {
    query.where("id", secondSiteId);
  });

  const resultBlog = await queryUtil.blogs((query) => {
    query.where("blog_id", blogId);
  });

  await helpers.dropDatabase(dbName);

  expect(resultSite).toBe(undefined);
  expect(resultBlog).toBe(undefined);
});
