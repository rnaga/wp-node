import { Command } from "commander";
import { z } from "zod";

import { CONFIG_DIR } from "../constants";

export * from "./settings";

export const getCommand = (args: {
  version?: string;
  description?: string;
}) => {
  const { version = "1.0.0", description = "" } = args;
  const program = new Command();

  // Avoid error: too many arguments.
  // https://github.com/tj/commander.js/blob/master/CHANGELOG.md#1300-2024-12-30
  program.allowExcessArguments();

  program
    .version(version)
    .description(description)
    .option("-j --configJson <config>", "Enter the json string to be processed")
    .option(
      "-c, --config <path>",
      `Enter the directory to the config file (default: ${CONFIG_DIR})`,
      CONFIG_DIR
    )
    .option("-a --assumedUser <userId>", "The user id to assume", "1");

  return program;
};

export const getChalk = async () => {
  return (await import("chalk")).default;
};

export const jsonToCsv = <T extends object>(data: T[]): string => {
  if (!data.length) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((field) => {
        const val = row[field as keyof T];
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
};
