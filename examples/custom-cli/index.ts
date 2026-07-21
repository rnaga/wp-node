// To execute this script, run:
// npx tsx ./index.ts -- page list
//
// For usage, run:
// npx tsx ./index.ts -- page -h

import "./_wp/settings";
import { Clis } from "@rnaga/wp-node-cli/clis";

import { PageCli } from "./list-pages.cli";

(async () => {
  Clis.register([PageCli]);
  await Clis.executeCommand(process.argv);
})();
