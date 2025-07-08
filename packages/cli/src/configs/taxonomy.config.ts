import { prompt } from "enquirer";

import {
  mkdir,
  readJsonFile,
  writeDFile,
  writeFile,
} from "@rnaga/wp-node/common/files";
import { CONFIG_DIR, CONFIG_MODULE_PREFIX } from "../constants";

import type * as types from "@rnaga/wp-node/types";
import type { CliConfig } from "./types";
import { Command } from "commander";

interface TaxonomyInput {
  name: string;
  hierarchical: boolean;
  directory: string;
}

export const taxonomyConfig: CliConfig<
  TaxonomyInput,
  types.JSONConfigTaxonomy
> = () => {
  const program = new Command();

  program
    .option(
      "-n, --name <type>",
      "Enter new taxonomy name (ASCII and underscore only)"
    )
    .option(
      "-h, --hierarchical <boolean>",
      "Specify if the taxonomy is hierarchical (yes/no)"
    );
  const prompts = async (options: Partial<TaxonomyInput>) => {
    const promptResponse = await prompt<Record<keyof TaxonomyInput, any>>([
      {
        required: true,
        type: "input",
        name: "name",
        message: "Enter new taxonomy name (ASCII and underscore only):",
        skip: options.name !== undefined,
        initial: options.name,
      },
      {
        type: "select",
        name: "hierarchical",
        message: "Is it hierarchical?",
        choices: ["Yes", "No"],
        skip: options.hierarchical !== undefined,
      },
    ]);

    return {
      ...options,
      ...promptResponse,
      hierarchical: promptResponse.hierarchical === "Yes",
    };
  };

  const generate = async (args: TaxonomyInput) => {
    const { name, hierarchical } = args;
    if (!name) {
      program.help();
      throw new Error("Error: Taxonomy name is required.");
    }

    mkdir(CONFIG_DIR);

    const jsonContent = {
      ...readJsonFile<types.JSONConfigTaxonomy>(`${CONFIG_DIR}taxonomy.json`),
      [name]: {
        hierarchical: hierarchical,
        showUi: false,
        capabilities: {
          manage_terms: "manage_terms",
          assign_terms: "assign_terms",
          edit_terms: "edit_terms",
          delete_terms: "delete_terms",
        },
      },
    };

    writeFile(
      `${CONFIG_DIR}taxonomy.json`,
      JSON.stringify(jsonContent, null, 2)
    );

    let tsContent = `declare module "${CONFIG_MODULE_PREFIX}types/taxonomy.d" {\n`;
    tsContent += "  interface TaxonomyNameExtend {\n";

    for (const key in jsonContent) {
      tsContent += `    ${key}: true;\n`;
    }

    tsContent += "  }\n";
    tsContent += "}";

    writeDFile(CONFIG_DIR, "taxonomy.d.ts", tsContent);

    return { tsContent, jsonContent };
  };

  return { program, prompts, generate };
};
