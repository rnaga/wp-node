import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { SiteCrud } from "@rnaga/wp-node/crud/site.crud";

import * as helpers from "../../../helpers";

test("update", async () => {
  const dbName = "wptest-site-crud-update";
  const testAppName = "site_crud_update";

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

  const userName = "site_crud_update";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "site_crud_update_sitename";

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

  const newPath = "/new_path";
  const newDomain = "localhost_updated";
  const result = await siteCrud.update(1, {
    path: newPath,
    domain: newDomain,
    meta_input: {
      new_meta1: "meta1",
      new_meta2: "meta2",
    },
  });

  expect(result.data).toBe(1);

  const sites = await siteCrud.list({
    domain: [newDomain],
    path: newPath,
  });

  expect(sites.data[0].domain).toBe(newDomain);
  expect(sites.data[0].path).toBe(newPath);
  await helpers.dropDatabase(dbName);
});
