import { Command } from "commander";

export type CliConfig<T = any, TContent = any> = () => {
  program: Command;
  prompts: (options: Partial<T>) => Promise<T>;
  generate: (args: T) => Promise<{
    tsContent?: string;
    jsonContent: TContent;
  }>;
};
