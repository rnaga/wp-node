import type * as types from "../../types";

import { Action } from "./action";
import { Filter } from "./filter";
import { HooksReflect } from "./hooks-reflect";

/**
 * Represents a collection of hooks for filtering and actions.
 *
 * TFilters - The type of filters.
 * TActions - The type of actions.
 */
export class Hooks<
  TFilters = types.hooks.Filters,
  TActions = types.hooks.Actions
> {
  /**
   * The map of hooks for each environment.
   *
   * @remarks The structure of the map is as follows:
   * - The key is the environment.
   * - The value is a map of hooks.
   *   - The key is the name of the hook which should be unique across all hooks.
   *   - The value is the hook class where its methods are decorated with `@filter` or `@action`.
   * @example
   * ```ts
   * @hook("example")
   * class ExampleHook {
   *    @filter("example_filter")
   *    async exampleFilter(n: number) {
   *        return n + 10;
   *    }
   * }
   * ```
   */
  static hooksEnvMap: Map<string, Map<string, types.Constructor>> = new Map();

  /**
   * Retrieves the hook map for the specified environment.
   *
   * @param env - The environment for which to retrieve the hook map.
   * @returns The hook map for the specified environment.
   */
  static get(env: string) {
    const hookMap =
      Hooks.hooksEnvMap.get(env) ?? new Map<string, types.Constructor>();
    return hookMap;
  }

  /**
   * Sets the hook map for the specified environment.
   *
   * @param env - The environment for which to set the hook map.
   * @param hookMap - The hook map to set.
   */
  static set(env: string, hookMap: Map<string, types.Constructor>) {
    Hooks.hooksEnvMap.set(env, hookMap);
  }

  #initialized = false;
  action: Action<TActions>;
  filter: Filter<TFilters>;

  /**
   * Creates an instance of Hooks.
   *
   * @param hooks - The map of hooks.
   */
  constructor(public hooks: Map<string, types.Constructor>) {
    this.filter = new Filter<TFilters>();
    this.action = new Action<TActions>();
  }

  /**
   * Initializes the hooks.
   * If the hooks have already been initialized, this method does nothing.
   */
  init() {
    if (this.#initialized) {
      return;
    }

    // Load default actions
    for (const hook of this.hooks.values()) {
      HooksReflect.register([this.filter, this.action], new hook(), hook);
    }
    this.#initialized = true;
  }
}
