import { Command } from "commander";

import { CONFIG_DIR } from "../constants";

// @ts-ignore - AutoComplete is not exported in types but exists at runtime
import AutoComplete from "enquirer/lib/prompts/autocomplete";
import { existsSync, readdirSync, statSync } from "fs";
import { join, dirname, basename } from "path";

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

const getFileChoices = (
  input: string,
  extensions?: string[]
): Array<{ name: string; value: string; message: string }> => {
  try {
    // Expand ~ to home directory
    const expandedInput = input.replace(/^~/, process.env.HOME || "~");

    let dir: string;
    let base: string;

    // Check if input ends with / (user wants to see directory contents)
    if (
      input.endsWith("/") ||
      (expandedInput &&
        existsSync(expandedInput) &&
        statSync(expandedInput).isDirectory())
    ) {
      dir = expandedInput.replace(/\/$/, "") || ".";
      base = "";
    } else {
      dir = expandedInput ? dirname(expandedInput) : ".";
      base = expandedInput ? basename(expandedInput) : "";
    }

    if (!existsSync(dir)) {
      const fallback = input || ".";
      return [{ name: fallback, value: fallback, message: fallback }];
    }

    const items = readdirSync(dir);
    const filtered = items
      .filter((item) =>
        base ? item.toLowerCase().startsWith(base.toLowerCase()) : true
      )
      .filter((item) => {
        const fullPath = join(dir, item);
        const isDir = statSync(fullPath).isDirectory();

        // Always show directories
        if (isDir) return true;

        // If no extensions specified, show all files
        if (!extensions || extensions.length === 0) return true;

        // Check if file has one of the specified extensions
        return extensions.some((ext) => item.endsWith(ext));
      })
      .map((item) => {
        const fullPath = join(dir, item);
        const isDir = statSync(fullPath).isDirectory();
        const display = `${fullPath}${isDir ? "/" : ""}`;
        return { name: fullPath, value: fullPath, message: display };
      });

    return filtered.length > 0
      ? filtered
      : [{ name: ".", value: ".", message: "." }];
  } catch (err) {
    const fallback = input || ".";
    return [{ name: fallback, value: fallback, message: fallback }];
  }
};

export const promptForFilePath = async (
  fieldName: string,
  message: string,
  required: boolean,
  options?: {
    extensions?: string[]; // e.g., [".crt", ".pem"]
    limit?: number; // Not used in current implementation
  }
): Promise<string> => {
  const { extensions = [], limit = 10 } = options || {};
  let valid = false;
  let filePath = "";
  let currentInput = "";

  while (!valid) {
    const autocomplete = new AutoComplete({
      name: fieldName,
      message,
      limit,
      initial: 0,
      choices: getFileChoices(currentInput, extensions),
      suggest(input: string, choices: any[]) {
        const newChoices = getFileChoices(input, extensions);
        return newChoices;
      },
    } as any);

    // Override the input to continue from where we left off
    if (currentInput) {
      autocomplete.input = currentInput;
      autocomplete.cursor = currentInput.length;
    }

    // Intercept the submit to handle directory navigation
    const originalSubmit = autocomplete.submit.bind(autocomplete);
    autocomplete.submit = async function () {
      const selectedValue = this.focused?.value || this.input;

      // Check if the selected value is a directory
      if (
        selectedValue &&
        existsSync(selectedValue) &&
        statSync(selectedValue).isDirectory()
      ) {
        // Don't submit, instead update input and refresh choices
        const trimmedValue = selectedValue.trimEnd() + "/";
        this.input = trimmedValue;
        this.cursor = trimmedValue.length; // Move cursor to end
        this.choices = getFileChoices(trimmedValue, extensions);
        this.index = 0;
        await this.render();
        return;
      }

      return originalSubmit();
    };

    const value = await autocomplete.run();

    if (!value || value.trim() === "") {
      if (required) {
        console.error(
          `❌ Error: This field is required. Please enter a valid path.`
        );
      } else {
        valid = true;
      }
    } else {
      // Remove trailing slash for validation
      const cleanValue = value.replace(/\/$/, "");
      if (existsSync(cleanValue)) {
        filePath = cleanValue;
        valid = true;
      } else {
        const skipMessage = required ? "" : " or press Enter to skip";
        console.error(
          `❌ Error: File not found at ${value}. Please enter a valid path${skipMessage}.`
        );
      }
    }
  }

  return filePath;
};
