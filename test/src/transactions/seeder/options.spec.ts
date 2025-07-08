import Application from "@rnaga/wp-node/application";
//import { Config } from "@rnaga/wp-node/config";
import { Options } from "@rnaga/wp-node/core/options";
import { Schema } from "@rnaga/wp-node/core/schema";
import { SeederTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("options", async () => {
  const dbName = "wptest-seeder-options";
  const testAppName = "wptest_seeder_options";

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
  const options = context.components.get(Options);
  //const config = context.components.get(Config);

  await schema.build("all");

  await seederTrx.populateOptions({
    siteUrl: helpers.siteUrl,
  });

  const home = await options.get("home");
  expect(home).toContain(helpers.siteUrl);

  await helpers.dropDatabase(dbName);
});
