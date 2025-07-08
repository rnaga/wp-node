import Application from "@rnaga/wp-node/application";
import { formatting } from "@rnaga/wp-node/common";
import { Installer } from "@rnaga/wp-node/core/installer";
import Database from "@rnaga/wp-node/database";
import { SeederTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../helpers";

test("install site", async () => {
  const dbName = "wptest-initialize-blog-test-multi";
  const testAppName = "initialilze_blog_test_multi";

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
  const database = context.components.get(Database);
  const seederTrx = context.components.get(SeederTrx);

  const userName = "__initialize_blog_username_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "initialize_blog_sitename";

  // Install new site
  const { userId } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__initialize_blog__",
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

  // Create blog
  let blogId = 0;
  const trx = await database.transaction;
  await trx
    .insert({
      blog_id: "2",
      site_id: "1",
      domain,
      path: "/",
      registered: formatting.dateMySQL(),
      last_updated: formatting.dateMySQL(),
      public: "1",
      archived: "0",
      mature: "0",
      spam: "0",
      deleted: "0",
      lang_id: "0",
    })
    .into("wp_blogs")
    .then((v) => {
      blogId = v[0];
    });
  await trx.commit();

  await installer.initializeBlog(blogId, {
    userId,
  });
  //await helpers.dropDatabase(dbName);
});
