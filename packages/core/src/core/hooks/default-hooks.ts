import type * as types from "../../types";
import { Init } from "./actions/init";
import { Capabilities } from "./filters/capabilities";
import { Hooks } from "./hooks";

export const defaultHooks: Set<types.Constructor> = new Set([
  Init,
  Capabilities,
]);

export class DefaultHooks {
  static loaded = false;
  static load(env: string) {
    const hookSet = Hooks.get(env);
    defaultHooks.forEach((defaultHook: any) =>
      hookSet.set(defaultHook.__name, defaultHook)
    );
    Hooks.set(env, hookSet);
  }
}
