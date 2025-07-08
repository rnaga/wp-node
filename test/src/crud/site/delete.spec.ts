import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { SiteCrud } from "@rnaga/wp-node/crud/site.crud";

import * as helpers from "../../../helpers";

test("delete", async () => {
  const dbName = "wptest-site-crud-delete";
  const testAppName = "site_crud_delete";

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

  const userName = "site_crud_delete";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "site_crud_delete_sitename";

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

  // Can't delete main site
  await expect(siteCrud.delete(1)).rejects.toThrow();

  const newDomain = "localhost_new";
  const result = await siteCrud.create({
    domain: newDomain,
    path: "/",
    siteName: `${siteName}_new`,
  });

  await siteCrud.delete(result.data.siteId);

  const sites = await siteCrud.list({
    include: [result.data.siteId],
  });

  expect(sites.data.length).toBe(0);

  const queryUtil = context.components.get(QueryUtil);
  const blogs = await queryUtil.blogs((query) => {
    query.where("blog_id", result.data.blogId);
  });

  expect(blogs).toBe(undefined);
  await helpers.dropDatabase(dbName);
});
