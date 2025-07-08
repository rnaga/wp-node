import { prompt } from "enquirer";

import {
  mkdir,
  readJsonFile,
  writeDFile,
  writeFile,
} from "@rnaga/wp-node/common/files";
import { CONFIG_DIR, CONFIG_MODULE_PREFIX } from "../constants";

import type { CliConfig } from "./types";
import type * as types from "@rnaga/wp-node/types";
import { Command } from "commander";

interface PostStatusInput {
  name: string;
  directory: string;
}

export const postStatusConfig: CliConfig<
  PostStatusInput,
  types.JSONConfigPostStatusObject
> = () => {
  const program = new Command();

  program.option(
    "-n, --name <type>",
    "Enter new post status name (ASCII and underscore only)"
  );

  const prompts = async (options: Partial<PostStatusInput>) => {
    const promptResponse = await prompt<Record<keyof PostStatusInput, any>>([
      {
        required: true,
        type: "input",
        name: "name",
        message: "Enter new post status name (ASCII and underscore only):",
        skip: options.name !== undefined,
        initial: options.name,
      },
    ]);

    return {
      ...options,
      ...promptResponse,
    };
  };

  const generate = async (args: PostStatusInput) => {
    const { name } = args;
    if (!name) {
      program.help();
      throw new Error("Error: Post status name is required.");
    }

    mkdir(CONFIG_DIR);

    const jsonContent: types.JSONConfigPostStatusObject = {
      ...readJsonFile<types.JSONConfigPostStatusObject>(
        `${CONFIG_DIR}post-status.json`
      ),
      [name]: {
        public: true,
        private: false,
        internal: true,
      },
    };

    writeFile(
      `${CONFIG_DIR}post-status.json`,
      JSON.stringify(jsonContent, null, 2)
    );

    let tsContent = `declare module "${CONFIG_MODULE_PREFIX}types/post.d" {\n`;
    tsContent += "  interface PostStatusExtend {\n";

    for (const key in jsonContent) {
      tsContent += `    ${key}: true;\n`;
    }

    tsContent += "  }\n";
    tsContent += "}";

    writeDFile(CONFIG_DIR, "post-status.d.ts", tsContent);

    return { tsContent, jsonContent };
  };

  return { program, prompts, generate };
};
