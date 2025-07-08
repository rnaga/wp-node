#!/usr/bin/env node

import "reflect-metadata";

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { copyFile, fileExists, mkdir } from "@rnaga/wp-node/common/files";
import { CONFIG_WP_ROOT_DIR } from "../constants";
import { wpConfig, WPInput } from "../configs/wp.config";

const { generate } = wpConfig();

export const init = async (input: WPInput) => {
  const { distDir = "." } = input;
  await generate(input);

  console.log("Installing settings.ts...");

  mkdir(distDir);

  const originalSettingsTs = fs.readFileSync(
    __dirname + "/templates/settings.ts",
    "utf8"
  );
  const settingsTs = originalSettingsTs.replaceAll(
    "../src/",
    "@rnaga/wp-node/"
  );

  fs.writeFileSync(`${distDir}/${CONFIG_WP_ROOT_DIR}/settings.ts`, settingsTs);

  const exampleIndexTs = fs.readFileSync(
    __dirname + "/templates/index.example.ts",
    "utf8"
  );
  fs.writeFileSync(`${distDir}/index.ts`, exampleIndexTs);

  copyFile(
    __dirname + `/templates/config/`,
    `${distDir}/${CONFIG_WP_ROOT_DIR}/config/`,
    {
      recursive: true,
    }
  );

  const tsConfigPath = path.resolve(process.cwd(), `${distDir}/tsconfig.json`);

  if (!fileExists(tsConfigPath)) {
    copyFile(__dirname + `/templates/tsconfig.json`, tsConfigPath);
  }

  // Install dependencies
  execSync(`cd ${distDir} && npm install --save-dev @types/node`);

  console.log("Done!");
};
