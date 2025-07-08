#!/usr/bin/env node

import { Clis } from "./clis";

(async () => {
  await Clis.executeCommand(process.argv);
})();
