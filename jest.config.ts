/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";

const config: Config = {
  moduleNameMapper: {
    "^@rnaga/wp-node/(.*)$": "<rootDir>/packages/core/src/$1",
    "^@rnaga/wp-node-cli/(.*)$": "<rootDir>/packages/cli/src/$1",
  },

  // exclude dist folders to avoid collision error - jest-haste-map: Haste module naming collision
  modulePathIgnorePatterns: [
    "<rootDir>/packages/cli/dist",
    "<rootDir>/packages/core/dist",
  ],

  setupFilesAfterEnv: ["./test/bootstrap.ts"],
  coverageProvider: "v8",
  testMatch: ["**/?(*.)+(spec|test).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "test/tsconfig.json" }],
  },
};

export default config;
