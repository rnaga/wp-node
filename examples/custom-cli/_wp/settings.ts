/// <reference types="./config/index" />

process.env.WP_DB_HOST = "localhost";
process.env.WP_DB_USER = "wp";
process.env.WP_DB_PASSWORD = "wp";
process.env.WP_DB_NAME = "wordpress";
process.env.WP_DB_PORT = "33306";

import * as dotenv from "dotenv";

import Application from "@rnaga/wp-node/application";
import * as configs from "@rnaga/wp-node/common/config";

// Load environment variables from .env file
dotenv.config();

import jsonConfig from "./config/wp.json";

// Load environment variables from .env file
dotenv.config();

if (!jsonConfig) {
  throw new Error("Failed to read wp.json file.");
}

const config = configs.defineWPConfig({
  ...jsonConfig,
  database: {
    client: "mysql2",
    connection: {
      database: process.env.WP_DB_NAME,
      host: process.env.WP_DB_HOST,
      port: parseInt(`${process?.env?.WP_DB_PORT ?? "3306"}`),
      user: process.env.WP_DB_USER,
      password: process.env.WP_DB_PASSWORD,
      charset: "utf8mb4",
    },
  },
});

Application.config = config;
