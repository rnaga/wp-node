import { prompt } from "enquirer";

import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { SeederTrx } from "@rnaga/wp-node/transactions";
import { getCommand } from "./utils";
import { Cli } from "./cli";
import { command, subcommand } from "./decorators";

@command("install", { description: "Initialize a new blog and create a user" })
export class InstallCli extends Cli {
  @subcommand("default")
  async default() {
    const chalk = (await import("chalk")).default;

    const program = getCommand({
      version: "1.0.0",
      description: "Initialize a new blog and create a user",
    });

    program
      .option("-u, --siteUrl <type>", "Enter your site URL")
      .option("-t --title <title>", "The title of the blog")
      .option("-e --userEmail <email>", "The user email of the blog")
      .option("-n --userName <name>", "The user name of the blog")
      .option("-p --password <password>", "The user password of the blog")
      .option("-b --public", "Whether the blog is public or not")
      .option("-y --yes", "Skip the confirmation prompt");

    //settings({ configDir: options.configDir, configJson: options.configJson });
    await this.settings({ program });

    const options = this.options;

    Application.installing = true;
    const context = await Application.getContext();
    const installer = context.components.get(Installer);

    if (await installer.isBlogInitialized(1)) {
      console.error(chalk.red("Blog is already initialized! Exiting..."));
      process.exit(1);
    }

    const promptResponse = await prompt<{
      yes: boolean;
      siteUrl: string;
      title: string;
      userEmail: string;
      userName: string;
      password: string;
      isPublic: boolean;
    }>([
      {
        type: "input",
        name: "siteUrl",
        message: "Enter your site URL:",
        initial: options.siteUrl ?? "http://localhost",
        skip: options.siteUrl !== undefined,
        validate: (input: string) => {
          if (input.startsWith("http")) {
            return true;
          } else {
            return "Please enter a valid URL";
          }
        },
      },
      {
        type: "input",
        name: "title",
        message: "What is the title of the blog?",
        initial: options.title ?? undefined,
        skip: options.title && options.title.length > 0,
      },
      {
        type: "input",
        name: "userEmail",
        message: "What is the user email of the blog?",
        initial: options.userEmail ?? undefined,
        skip: options?.userEmail && options.userEmail.length > 0,
        validate: (input: string) => {
          if (input.includes("@")) {
            return true;
          } else {
            return "Please enter a valid email";
          }
        },
      },
      {
        type: "input",
        name: "userName",
        message: "What is the user name of the blog?",
        initial: options.userName ?? undefined,
        skip: options.userName && options.userName.length > 0,
        validate: (input: string) => {
          if (input.length < 4) {
            return "User name must be at least 4 characters long";
          }
          return true;
        },
      },
      {
        type: "password",
        name: "password",
        message: "What is the user password?",
        initial: options.password ?? undefined,
        skip: options.password && options.password.length > 0,
      },
      {
        type: "confirm",
        name: "isPublic",
        message: "Is the blog public?",
        initial: options.public ?? undefined,
        skip: options.public !== undefined,
      },
      {
        type: "confirm",
        name: "yes",
        message: "Procceed?",
        initial: options.yes ?? undefined,
        skip: options.yes !== undefined,
      },
    ]);

    if (!promptResponse.yes) {
      console.log("Exiting...");
      process.exit(0);
    }
    console.log("Creating databases...");

    const result = await installer.install({
      siteUrl: promptResponse.siteUrl,
      blogTitle: promptResponse.title,
      userName: promptResponse.userName,
      userEmail: promptResponse.userEmail,
      userPassword: promptResponse.password,
      isPublic: promptResponse.isPublic,
    });

    const userId = result.userId;
    if (!userId) {
      throw new Error("Failed to create blog.");
    }

    if (context.config.isMultiSite()) {
      console.log("Initializing multisite...");

      const domain = new URL(result.url).hostname;
      const seederTrx = context.components.get(SeederTrx);

      // Run seeder for a new site
      const resultPopulateSite = await seederTrx.populateSite(
        {
          domain,
          email: promptResponse.userEmail,
          siteName: promptResponse.title,
          path: "/",
        },
        {
          subdomainInstall: true,
        }
      );

      if (!resultPopulateSite) {
        throw new Error("Failed to initialize multisite.");
      }
    }

    console.log(chalk.green("Blog created successfully!"));
    console.log({
      siteUrl: result.url,
      blogTitle: promptResponse.title,
      userName: promptResponse.userName,
      userEmail: promptResponse.userEmail,
      userId: result.userId,
    });

    return result;
  }
}
