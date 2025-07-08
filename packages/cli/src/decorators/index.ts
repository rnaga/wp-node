import "reflect-metadata";
import { REFLECT_METADATA_KEY_SUBCOMMAND } from "../constants";

export function command(
  cmd: string,
  options?: {
    description?: string;
    version?: string;
    multisite?: boolean;
  }
) {
  return function (target: any) {
    // Save the command name and description to the class.
    // This will be used to determine which class to instantiate.
    target.__cmd = cmd;
    target.description = options?.description;
    target.version = options?.version;
    target.multisite = options?.multisite;
  };
}

export function subcommand(
  subCmd: string,
  options?: {
    description?: string;
    multisite?: boolean;
    // When a subcommand is persistent,
    // Clis.executeCommand will not execute the flush method which terminates the database connection.
    persistent?: boolean;
  }
) {
  return function (
    target: any,
    propertyKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    descriptor: PropertyDescriptor
  ) {
    const subCmdMap =
      Reflect.getMetadata(REFLECT_METADATA_KEY_SUBCOMMAND, target) ??
      new Map<
        string,
        { propertyKey: string; description?: string; multisite?: boolean }
      >();

    subCmdMap.set(subCmd, {
      propertyKey,
      description: options?.description,
      multisite: options?.multisite,
      persistent: options?.persistent,
    });

    Reflect.defineMetadata(REFLECT_METADATA_KEY_SUBCOMMAND, subCmdMap, target);
  };
}
