import { prompt } from "enquirer";

import {
  updateEnvFile,
  fileExists,
  mkdir,
  writeFile,
} from "@rnaga/wp-node/common/files";

import type * as types from "@rnaga/wp-node/types";
import type { CliConfig } from "./types";

import { CONFIG_DIR } from "../constants";
import { Command } from "commander";

export interface WPInput {
  dbuser: string;
  dbpassword: string;
  dbname: string;
  dbhost: string;
  dbport: number;
  multi: boolean;
  staticAssetPath: string;
  environment?: string;
  distDir?: string;
}

export type Prompt<T> = Parameters<typeof prompt<T>>[0];

export const wpPrompts = async <
  T extends Record<string, any> = Record<string, any>
>(
  options: Partial<WPInput>,
  extendPrompts?: any[]
) => {
  const responses = await prompt<Record<keyof WPInput & keyof T, any>>([
    {
      required: true,
      type: "input",
      name: "dbhost",
      message: "Enter your database hostname:",
      initial: options.dbhost ?? "localhost",
      skip: options.dbhost !== undefined,
    },
    {
      required: true,
      type: "input",
      name: "dbport",
      message: "Enter your database port:",
      initial: options.dbport ?? 3306,
      skip: options.dbport !== undefined,
    },
    {
      required: true,
      type: "input",
      name: "dbuser",
      message: "Enter your database username:",
      initial: options.dbuser,
      skip: options.dbuser !== undefined,
    },
    {
      required: true,
      type: "password",
      name: "dbpassword",
      message: "Enter your database password:",
      initial: options.dbpassword,
      skip: options.dbpassword !== undefined,
    },
    {
      required: true,
      type: "input",
      name: "dbname",
      message: "Enter your database name:",
      initial: options.dbname,
      skip: options.dbname !== undefined,
    },
    {
      type: "select",
      name: "multi",
      message: "Is it a multi-site?",
      choices: ["No", "Yes"],
      skip: options.multi !== undefined,
    },
    {
      type: "input",
      name: "staticAssetPath",
      message: "Enter your static assets path:",
      initial: options.staticAssetPath ?? "public",
      skip: options.staticAssetPath !== undefined,
    },
    ...(Array.isArray(extendPrompts) ? extendPrompts : []),
  ]);

  return {
    ...options,
    ...responses,
    multi: responses.multi === "Yes",
  } as WPInput & T;
};

export const wpConfig: CliConfig<WPInput, types.JSONWPConfig> = () => {
  const program = new Command();

  // Avoid error: too many arguments.
  // https://github.com/tj/commander.js/blob/master/CHANGELOG.md#1300-2024-12-30
  program.allowExcessArguments();

  program
    // Set up command-line options
    .option("-U, --dbuser <type>", "Enter your database username")
    .option("-P, --dbpassword <type>", "Enter your database password")
    .option("-p --port <type>", "Enter your database port")
    .option("-D, --dbname <type>", "Enter your database name")
    .option("-H, --dbhost <type>", "Enter your database hostname")
    .option("-m, --multi <type>", "Specify if the site is multi-site (yes/no)")
    .option("-s, --staticAssetPath <type>", "Enter your static assets path");

  const generate = async (args: WPInput) => {
    const {
      dbuser,
      dbpassword,
      dbname,
      dbhost,
      dbport,
      multi,
      staticAssetPath,
      environment,
      distDir = ".",
    } = args;

    // Check and assign variable to see if `wp.json` exists
    const defaultConfigExists = fileExists(`${distDir}/${CONFIG_DIR}/wp.json`);

    if (defaultConfigExists) {
      throw new Error(
        "WP config (_wp/config/wp.json) already exists. Please remove it first."
      );
    }

    mkdir(`${distDir}/${CONFIG_DIR}`);

    let jsonContent: types.JSONWPConfig = {
      staticAssetsPath: staticAssetPath,
    };

    if (multi) {
      jsonContent = {
        ...jsonContent,
        multisite: {
          enabled: true,
          defaultBlogId: 1,
          defaultSiteId: 1,
        },
      };
    }

    writeFile(
      `${distDir}/${CONFIG_DIR}wp.json`,
      JSON.stringify(jsonContent, null, 2)
    );

    if (!fileExists(`${distDir}/${CONFIG_DIR}index.d.ts`)) {
      writeFile(`${distDir}/${CONFIG_DIR}index.d.ts`, `export {}`);
    }

    const envPrefix = "WP_";

    const env = {
      [`${envPrefix}DB_HOST`]: dbhost,
      [`${envPrefix}DB_USER`]: dbuser,
      [`${envPrefix}DB_PASSWORD`]: dbpassword,
      [`${envPrefix}DB_NAME`]: dbname,
      [`${envPrefix}DB_PORT`]: dbport,
    };

    updateEnvFile(env, {
      environment,
      distDir,
    });

    return { jsonContent };
  };

  return { program, prompts: wpPrompts, generate };
};
