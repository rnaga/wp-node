import Application from "@rnaga/wp-node/application";
import { Options } from "@rnaga/wp-node/core/options";
import { Schema } from "@rnaga/wp-node/core/schema";
import { SeederTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

import type * as types from "@rnaga/wp-node/types";

test("roles", async () => {
  const dbName = "wptest-seeder-roles";
  const testAppName = "wptest_seeder_roles";

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

  await schema.build("all");

  await seederTrx.populateRoles();

  const roles = await options.get<types.Roles>("wp_user_roles");

  if (!roles) {
    expect(false).toBe(true);
  } else {
    expect(roles["administrator"].name).toBe("Administrator");
    expect(
      Object.values(roles["administrator"].capabilities).length
    ).toBeGreaterThan(0);
  }
  await helpers.dropDatabase(dbName);
});
