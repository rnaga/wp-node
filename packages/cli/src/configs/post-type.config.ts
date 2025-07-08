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
interface PostTypeObjectInput {
  name: string;
  directory: string;
}

export const postTypeConfig: CliConfig<
  PostTypeObjectInput,
  types.JSONConfigPostTypeObject
> = () => {
  const program = new Command();

  program.option(
    "-n, --name <type>",
    "Enter new post type name (ASCII and underscore only)"
  );

  const prompts = async (options: Partial<PostTypeObjectInput>) => {
    const promptResponse = await prompt<Record<keyof PostTypeObjectInput, any>>(
      [
        {
          required: true,
          type: "input",
          name: "name",
          message: "Enter new post type name (ASCII and underscore only):",
          skip: options.name !== undefined,
          initial: options.name,
        },
      ]
    );

    return {
      ...options,
      ...promptResponse,
    };
  };

  const generate = async (args: PostTypeObjectInput) => {
    const { name } = args;
    if (!name) {
      program.help();
      throw new Error("Error: Post type name is required.");
    }

    mkdir(CONFIG_DIR);

    const jsonContent: types.JSONConfigPostTypeObject = {
      ...readJsonFile<types.JSONConfigPostTypeObject>(
        `${CONFIG_DIR}post-type.json`
      ),
      [name]: {
        public: true,
        capabilityType: "post",
        supports: [
          "title",
          "editor",
          "author",
          "thumbnail",
          "excerpt",
          "trackbacks",
          "custom-fields",
          "comments",
          "revisions",
          "post-formats",
        ] as types.PostTypeSupports[],
        deleteWithUser: true,
        mapMetaCap: true,
        showInRest: true,
      },
    };

    writeFile(
      `${CONFIG_DIR}post-type.json`,
      JSON.stringify(jsonContent, null, 2)
    );

    let tsContent = `declare module "${CONFIG_MODULE_PREFIX}types/post.d" {\n`;
    tsContent += "  interface PostTypeExtend {\n";

    for (const key in jsonContent) {
      tsContent += `    ${key}: true;\n`;
    }

    tsContent += "  }\n";
    tsContent += "}";

    writeDFile(CONFIG_DIR, "post-type.d.ts", tsContent);

    return { tsContent, jsonContent };
  };

  return { program, prompts, generate };
};
