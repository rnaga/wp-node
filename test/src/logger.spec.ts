import Application from "@rnaga/wp-node/application";
import { Logger } from "@rnaga/wp-node/core/logger";
import type * as types from "@rnaga/wp-node/types";

test("logger", async () => {
  const context = await Application.getContext("multi");

  let logMessage = "";
  let logMeta: Record<string, any> | undefined = undefined;
  let logLevel: types.LogLevel = "info";

  // Register a hook to capture the log message
  context.hooks.action.add(
    "core_logging",
    (...args: types.hooks.ActionParameters<"core_logging">) => {
      logMessage = args[0];
      logMeta = args[1] || undefined;
      logLevel = args[2];
    }
  );

  const logger = context.components.get(Logger);
  logger.info("debug", { key: "value" });

  expect(logMessage).toBe("debug");
  expect(logMeta).toEqual({ key: "value" });
  expect(logLevel).toBe("info");
});
