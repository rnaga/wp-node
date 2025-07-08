import dotenv from "dotenv";
import path from "path";
import fs from "fs";

import { OptionValues } from "commander";

import Application from "@rnaga/wp-node/application";
import {
  definePostStatus,
  definePostType,
  defineTaxonomies,
  defineWPConfig,
} from "@rnaga/wp-node/common/config";
import { readJsonFile } from "@rnaga/wp-node/common/files";
import { CONFIG_DIR } from "../constants";

import type * as types from "@rnaga/wp-node/types";

export const settings = async (options: OptionValues) => {
  const { configJson, environment = "" } = options;
  let configDir = options.configDir ?? CONFIG_DIR;

  // Check if config is already loaded
  // (i.e. database config is set)
  if (
    Application?.config?.database ||
    (Array.isArray(Application?.configs) &&
      Application.configs.some((c) => c?.database))
  ) {
    return;
  }

  // Load environment variables from .env file
  const envFile = path.resolve(
    process.cwd(),
    `.env${environment ? "." + environment : ""}`
  );

  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }

  configDir = path.resolve(configDir);

  const jsonConfig = configJson
    ? JSON.parse(configJson)
    : readJsonFile<types.Config>(`${configDir}/wp.json`);

  if (!jsonConfig) {
    console.log(`
      Failed to load wp.json file. Please make sure the file exists in the directory.
      or provide the json string using the --configJson flag.
      `);

    console.log(
      jsonConfig,
      `${configDir}/wp.json`,
      readJsonFile<types.Config>(`${configDir}/wp.json`)
    );
    throw new Error(`Failed to read wp.json file. ${jsonConfig}`);
  }

  const jsonConfigTaxonomy =
    readJsonFile<Record<string, types.ConfigTaxonomy>>(
      `${configDir}/taxonomy.json`
    ) ?? {};

  const jsonConfigPostType =
    readJsonFile<Record<string, types.ConfigPostTypeObject>>(
      `${configDir}/post-type.json`
    ) ?? {};

  const jsonConfigPostStatus =
    readJsonFile<Record<string, types.ConfigPostStatusObject>>(
      `${configDir}/post-status.json`
    ) ?? {};

  const taxonomies = defineTaxonomies(jsonConfigTaxonomy);
  const postTypeObject = definePostType(jsonConfigPostType);
  const postStatusObject = definePostStatus(jsonConfigPostStatus);

  const jsonConfigDatabase = jsonConfig?.database?.connection;

  const config = defineWPConfig({
    ...jsonConfig,
    database: {
      client: "mysql2",
      connection: {
        database: jsonConfigDatabase?.database ?? process.env.WP_DB_NAME,
        host: jsonConfigDatabase?.host ?? process.env.WP_DB_HOST,
        port: parseInt(
          jsonConfigDatabase?.post ?? process.env.WP_DB_PORT ?? "3306"
        ),
        user: jsonConfigDatabase?.user ?? process.env.WP_DB_USER,
        password: jsonConfigDatabase?.password ?? process.env.WP_DB_PASSWORD,
        charset: "utf8mb4",
      },
    },
    taxonomies,
    postTypeObject,
    postStatusObject,
  });

  Application.config = config;
};
