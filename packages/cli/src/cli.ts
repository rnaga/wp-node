import { Command } from "commander";

import Application from "@rnaga/wp-node/application";
import { filterRecordByFields, jsonToCsv, settings } from "./utils";
import { ZodType, z } from "zod";

import type * as types from "@rnaga/wp-node/types";

class CommandHelper {
  argv: string[];
  #parsed?: ReturnType<Command["parse"]>;

  constructor(argv: string[]) {
    this.argv = argv;
  }

  resetArgv(argv: string[]) {
    this.argv = argv;
    this.#parsed = undefined;
  }

  set program(program: Command) {
    this.#parsed = program.parse(this.argv);
  }

  get program() {
    if (!this.#parsed) {
      throw new Error("Program not set");
    }
    return this.#parsed;
  }

  get options() {
    return this.program.opts();
  }

  getOption<T extends ZodType<any, any, any>>(
    key: string,
    val: T
  ): z.infer<T> | undefined {
    const option = this.program.opts()[key];

    if (!option) {
      return undefined;
    }

    return val.parse(this.program.opts()[key]);
  }

  getArg<T extends ZodType<any, any, any>>(index: number, val?: T): z.infer<T> {
    const arg = this.program.args[index];

    return val ? val.parse(arg) : arg;
  }
}

export abstract class Cli {
  argv: string[];
  command: CommandHelper;
  multisite: boolean = false;

  constructor(argv: string[]) {
    this.argv = argv;
    this.command = new CommandHelper(argv);
  }

  resetArgv(argv: string[]) {
    this.argv = argv;
    this.command.resetArgv(argv);
  }

  protected setCommand(program: Command) {
    this.command.program = program;
  }

  protected get options() {
    return this.command.options;
  }

  protected async settings(args?: { program?: Command }) {
    const program = args?.program;
    if (program) this.setCommand(program);

    const options = this.options;

    // Initialize the application settings
    settings(options);

    // Check multisite
    if (this.multisite === true) {
      const context = await Application.getContext();
      if (!context.config.isMultiSite()) {
        throw new Error("Multisite is not enabled");
      }
    }
  }

  protected get assumedUserId() {
    return parseInt(this.options.assumedUser ?? "1");
  }

  protected flush() {
    // Don't terminate the application during tests.
    if (process.env.NODE_ENV === "test" || Boolean(process.env.REPL) === true) {
      return;
    }
    Application.terminate();
  }

  protected output(
    type: types.LogLevel,
    data: string | Record<string, any> | Record<string, any>[]
  ) {
    const hasObjectData = (data: any) =>
      typeof data === "object" && "data" in data;

    if (hasObjectData(data)) {
      try {
        const filteredData = {
          ...(data as any),
          data: filterRecordByFields(
            (data as any).data as any,
            this.options.fields
          ),
        };
        data = filteredData;
      } catch (error) {
        console.error("Error filtering data:", error);
      }
    }

    const format = this.options.outputFormat || "json";

    if (format === "table" && hasObjectData(data)) {
      console.table((data as any).data);
    } else if (format === "raw") {
      console.log(JSON.stringify({ [type]: data }));
    } else if (format === "csv" && hasObjectData(data)) {
      const csv = jsonToCsv((data as any).data);
      console.log(csv);
    } else {
      console.dir({ [type]: data }, { depth: null });
    }
  }
}
