/// <reference types="./config/index" />

import * as dotenv from "dotenv";

import Application from "../src/application";
import * as configs from "../src/common/config";

// Load environment variables from .env file
dotenv.config();

import jsonConfig from "./config/wp.json";

// Uncomment the following lines if you have taxonomy, post-type, and post-status files
//
// import jsonConfigTaxonomy from "./config/taxonomy.json";
// import jsonConfigPostType from "./config/post-type.json";
// import jsonConfigPostStatus from "./config/post-status.json";

// Load environment variables from .env file
dotenv.config();

if (!jsonConfig) {
  throw new Error("Failed to read wp.json file.");
}

// Uncomment the following lines if you have taxonomy, post-type, and post-status files
//
// const taxonomies = configs.defineTaxonomies(jsonConfigTaxonomy);
// const postTypeObject = configs.definePostType(jsonConfigPostType);
// const postStatusObject = configs.definePostStatus(jsonConfigPostStatus);

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
  // Uncomment the following lines if you have taxonomy, post-type, and post-status files
  //
  // taxonomies,
  // postTypeObject,
  // postStatusObject,
});

Application.config = config;
