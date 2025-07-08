import "reflect-metadata";

import type * as types from "./types";
import { Context } from "./core/context";
import Database from "./database";
import { Hooks } from "./core/hooks/hooks";
import { DefaultHooks } from "./core/hooks/default-hooks";

/**
 * The Application class serves as a central helper for managing the lifecycle of the application.
 * It provides methods to initialize and retrieve application contexts, register hooks, and manage configurations.
 *
 * Key Responsibilities:
 * - **Context Initialization**: The `getContext` method initializes and retrieves the application context for a given environment.
 *   It ensures that hooks and configurations are properly set up and passed to the context.
 * - **Hook Registration**: The `registerHooks` method allows registering custom hooks for specific environments.
 *   Hooks are used to extend or modify the application's behavior dynamically.
 * - **Configuration Management**: The class holds global and environment-specific configurations, which are passed to the context during initialization.
 *
 * Usage:
 * - Use `Application.getContext(env)` to retrieve the application context for a specific environment.
 * - Use `Application.registerHooks(clazzes, env)` to register hooks for an environment.
 * - Access `Application.configs` or `Application.config` to manage configurations.
 *
 * This class is designed to be used as a static utility and cannot be instantiated directly.
 */
export default class Application {
  /**
   * A flag to indicate if the application is currently installing.
   */
  static installing: boolean = false;
  /**
   * Stores the global configurations accessible across different parts of the application.
   */
  static configs: types.Configs;

  /**
   * A singular configuration object if only one environment configuration is needed.
   */
  static config: types.Config;

  /**
   * A map storing instances of Hooks by environment keys.
   */
  private static hooksInstanceMap: Map<string, Hooks> = new Map();

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Returns the map of hooks instances.
   */
  static get hooks() {
    return Application.hooksInstanceMap;
  }

  /**
   * Registers hooks for a given environment.
   *
   * @param clazzes - Array of hook class constructors to be registered.
   * @param env - Optional environment name, defaults to "default".
   */
  static registerHooks(clazzes: types.Constructor[], env = "default") {
    const hookMap = Hooks.get(env);
    let clazz: any;
    for (clazz of clazzes) {
      // __name is set by @hook decorator
      if (!clazz.__name) {
        throw new Error(
          "Hook name is not defined. Use @hook decorator to define a unique name for the hook."
        );
      }
      hookMap.set(clazz.__name, clazz);
    }

    Hooks.set(env, hookMap);
  }

  /**
   * Retrieves the application context for a given environment,
   * initializing hooks and configurations.
   *
   * This method initializes the hooks based on the environment
   * and hooks registered via the `registerHooks` method.
   *
   * It ensures the application configuration is valid
   * and throws errors if not properly set.
   *
   * @param env - The environment identifier for which to get the context, defaults to "default".
   * @returns Promise<Context> - A promise that resolves to the instance
   *  of Context configured with appropriate hooks and settings.
   * @throws Error - If the configuration is invalid or undefined.
   */
  static async getContext(env: string = "default"): Promise<Context> {
    // Load and add default hooks
    DefaultHooks.load(env);

    if (!Application.config && !Application.configs[env]) {
      throw new Error("Invalid Config");
    }
    let config: types.Config | undefined = undefined;

    if (Application.configs && Application.configs[env]) {
      config = Application.configs[env];
    } else if (Application.config) {
      config = Application.config;
    }

    if (!config) {
      throw new Error("Empty config");
    }

    let hooks = Application.hooksInstanceMap.get(env);
    if (!hooks) {
      // Merge default hooks to non-default hooks \}
      if (env !== "default") {
        const hookMap = Hooks.get(env);
        const defaultHookSet = Hooks.get("default");
        if (defaultHookSet) {
          defaultHookSet.forEach((hook: any) => hookMap.set(hook.__name, hook));
        }
      }

      hooks = new Hooks(Hooks.get(env));
      Application.hooksInstanceMap.set(env, hooks);
    }

    hooks.init();

    return await Context.getInstance(config, {
      env,
      hooks,
      installing: Application.installing,
    });
  }

  /**
   * Closes all database connections gracefully.
   */
  static terminate() {
    Database.closeAll();
  }
}
