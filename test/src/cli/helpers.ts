import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

export const cliInstall = async (env: "multi" | "single", dbName: string) => {
  const configJson = JSON.stringify(helpers.getCliConfig(env, dbName));

  process.argv = [
    "",
    "",
    "install",
    "--configJson",
    configJson,
    "--siteUrl",
    helpers.siteUrl,
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

  return result;
};
