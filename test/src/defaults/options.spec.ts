import Application from "@rnaga/wp-node/application";
import { Config } from "@rnaga/wp-node/config";
import * as defaults from "@rnaga/wp-node/defaults";
import * as helpers from "../../helpers";

test("default options", async () => {
  const context = await Application.getContext("multi");

  const config = context.components.get(Config);

  const options = defaults.options(config, {
    siteUrl: helpers.siteUrl,
  });

  expect(options["blogname"]).toBe("My Site");
});
