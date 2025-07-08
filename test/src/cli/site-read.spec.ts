import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("site get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const site = await Clis.executeCommand([
    "",
    "",
    "site",
    "get",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(site.id).toBe(1);
});

test("site list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const sites = await Clis.executeCommand([
    "",
    "",
    "site",
    "list",
    "--configJson",
    configJson,
  ]);

  expect(sites.data.length).toBeGreaterThan(0);
});
