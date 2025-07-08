import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";
import { cliInstall } from "./helpers";

test("site create, update and delete", async () => {
  const dbName = "wptest-cli-site";

  // Create a test database
  await helpers.createDatabase(dbName);
  await cliInstall("multi", dbName);

  const configJson = JSON.stringify(helpers.getCliConfig("multi", dbName));

  const random = Math.floor(Math.random() * 100000);

  // Create a site
  const site = await Clis.executeCommand([
    "",
    "",
    "site",
    "create",
    "--name",
    `testcli`,
    "--domain",
    `localhost${random}.com`,
    "--path",
    "/",
    "--configJson",
    configJson,
  ]);

  expect(site.siteId).toBeGreaterThan(0);
  const siteId = site.siteId;

  // Update the site
  const updatedSite = await Clis.executeCommand([
    "",
    "",
    "site",
    "update",
    siteId,
    "--path",
    "/test-site-updated",
    "--configJson",
    configJson,
  ]);

  expect(updatedSite.data).toBeGreaterThan(0);

  // Delete the site
  const deletedSite = await Clis.executeCommand([
    "",
    "",
    "site",
    "delete",
    siteId,
    "--yes",
    "--configJson",
    configJson,
  ]);

  expect(deletedSite.data).toBeTruthy();

  await helpers.dropDatabase(dbName);
});
