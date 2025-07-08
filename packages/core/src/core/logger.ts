import { Config } from "../config";
import { component } from "../decorators/component";
import { Vars } from "./vars";
import type * as types from "../types";

@component()
export class Logger {
  private static logLevelMappping: Record<types.LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(private vars: Vars, private config: Config) {}

  /**
   * Log a message
   *
   * @param message - The message to log
   * @param meta  - Additional data to log
   * @param level - The log level
   * @returns
   */
  private log(
    message: string,
    meta?: Record<string, any>,
    level: types.LogLevel = "info"
  ) {
    const configLogLevel = this.config.config.constants.WP_LOG_LEVEL;

    // Skip logging if the log level is higher than the config log level
    if (
      Logger.logLevelMappping[level] < Logger.logLevelMappping[configLogLevel]
    ) {
      return;
    }

    const action = this.vars.CONTEXT.hooks.action;
    action.do("core_logging", message, meta, level);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log(message, meta, "debug");
  }

  info(message: string, meta?: Record<string, any>) {
    this.log(message, meta, "info");
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log(message, meta, "warn");
  }

  error(message: string, meta?: Record<string, any>) {
    this.log(message, meta, "error");
  }
}
