import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { SiteCrud } from "@rnaga/wp-node/crud/site.crud";

import * as helpers from "../../../helpers";

test("create", async () => {
  const dbName = "wptest-site-crud-create";
  const testAppName = "site_crud_create";

  // Create a test database
  await helpers.createDatabase(dbName);

  const configs = {
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

  configs.site_crud_create.multisite.subdomainInstall = false;

  Application.configs = configs;

  const context = await Application.getContext(testAppName);
  const installer = context.components.get(Installer);

  const userName = "site_crud_create";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "site_crud_create_sitename";

  const { userId } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  await installer.initializeSite(
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

  await context.current.switchSite(1, 1);
  await context.current.assumeUser(userId);

  const siteCrud = context.components.get(SiteCrud);

  // Invalid path
  await expect(
    siteCrud.create({
      domain: "test.com",
      path: "/999999",
      siteName: `${siteName}_new`,
    })
  ).rejects.toThrow();

  // Invalid domain
  await expect(
    siteCrud.create({
      domain: "INVALID.DOMAIN.TEST",
      path: "/",
      siteName: `${siteName}_new`,
    })
  ).rejects.toThrow();

  // path contains existing user
  await expect(
    siteCrud.create({
      domain: "test.com",
      path: `/${userName}`,
      siteName: `${siteName}_new`,
    })
  ).rejects.toThrow();

  // reserved name
  await expect(
    siteCrud.create({
      domain: "test.com",
      path: `/wp-admin`,
      siteName: `${siteName}_new`,
    })
  ).rejects.toThrow();

  const newDomain = "localhost_new.test";
  const result = await siteCrud.create({
    domain: newDomain,
    path: "/",
    siteName: `${siteName}_new`,
  });

  await context.current.switchSite(result.data.siteId, result.data.blogId);
  await context.current.assumeUser(userId);

  const sites = await siteCrud.list({
    domain: [newDomain],
  });

  expect(sites.data[0].domain).toBe(newDomain);
  await helpers.dropDatabase(dbName);
});
