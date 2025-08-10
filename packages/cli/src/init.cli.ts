import "reflect-metadata";

import { wpConfig } from "./configs/wp.config";
import { init } from "./init/init";
import { execSync } from "child_process";
import { command, subcommand } from "./decorators";
import { Cli } from "./cli";

@command("init", {
  description:
    "Initialize WP with Node. (Generate wp.json and install dependencies)",
})
export class InitCli extends Cli {
  @subcommand("default")
  async default() {
    const { prompts, program } = wpConfig();
    try {
      const wpInput = await program
        // Filter out the "--" argument that is used to separate options from positional arguments
        .parseAsync(process.argv.filter((v) => v !== "--"))
        .then(() => {
          const options = program.opts();
          return prompts(options);
        });

      init(wpInput);

      console.log("Installing dependencies...");

      // Install dependencies
      const dependencies = ["@rnaga/wp-node"];
      execSync(`npm i -S ${dependencies.join(" ")}`, { stdio: "inherit" });

      // Install dev dependencies
      const devDependencies = ["typescript", "@types/node"];
      execSync(`npm i -D ${devDependencies.join(" ")}`, { stdio: "inherit" });
    } catch (e) {
      console.error(e);
    }
  }
}
