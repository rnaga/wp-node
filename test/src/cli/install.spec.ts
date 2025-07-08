import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("install", async () => {
  const dbName = "wptest-cli-install";

  // Create a test database
  await helpers.createDatabase(dbName);

  const configJson = JSON.stringify(helpers.getCliConfig("multi", dbName));

  process.argv = [
    "",
    "",
    "install",
    "--configJson",
    configJson,
    "--siteUrl",
    "http://localhost",
    "--title",
    "test",
    "--userEmail",
    "test@test.com",
    "--userName",
    "test",
    "--password",
    "test",
    "--public",
    "true",
    "--yes",
    "true",
  ];

  const result = await Clis.executeCommand(process.argv);

  expect(result.userId > 0).toBe(true);
  expect(result.url).toBe("http://localhost");

  await helpers.dropDatabase(dbName);
});
