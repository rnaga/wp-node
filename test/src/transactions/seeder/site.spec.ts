import Application from "@rnaga/wp-node/application";
import { Schema } from "@rnaga/wp-node/core/schema";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { SeederTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("site and sitemeta", async () => {
  const dbName = "wptest-seeder-site";
  const testAppName = "wptest_seeder_site";

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
  const schema = context.components.get(Schema);
  const seederTrx = context.components.get(SeederTrx);
  const userTrx = context.components.get(UserTrx);
  const queryUtil = context.components.get(QueryUtil);

  await schema.build("all");

  const adminUserLogin = "seeder_site";
  const adminUser = `${adminUserLogin}@example.com`;
  const domain = "seeder_site";
  const siteName = "seeder_sitename";

  // site seeder needs admin user
  await userTrx.upsert({
    role: "administrator",
    user_email: adminUser,
    user_login: adminUserLogin,
  });

  // populate options
  await seederTrx.populateOptions({
    siteUrl: helpers.siteUrl,
  });

  await seederTrx.populateSite(
    {
      domain,
      email: adminUser,
      siteName,
      path: "/site",
    },
    {
      subdomainInstall: true,
    }
  );

  // Check site
  const site = await queryUtil.sites((query) => {
    query.where("domain", domain);
  });
  expect(site && 0 < site?.length).toBe(true);

  const siteId = (site as { id: number }[])[0].id;

  // Check sitemeta
  const meta = await queryUtil.meta("site", (query) => {
    query.withIds([siteId], { joinPrimary: false }).withKeys(["site_name"]);
  });
  expect((meta as { meta_value: string }[])[0].meta_value).toBe(siteName);

  // Check blog
  const blog = await queryUtil.blogs((query) => {
    query.where("domain", domain);
  });
  expect((blog as { domain: string }[])[0].domain).toBe(domain);

  await helpers.dropDatabase(dbName);
});
