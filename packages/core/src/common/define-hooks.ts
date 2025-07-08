import { Hooks } from "../core/hooks/hooks";
import * as types from "../types";

export const defineHooks = <
  TFilters = types.hooks.Filters,
  TActions = types.hooks.Actions
>(
  env: string,
  clazzes?: types.Constructor[]
) => {
  const hooksSet = Hooks.get(env);
  clazzes &&
    clazzes.map((clazz: any) => {
      hooksSet.set(clazz.__name, clazz);
    });

  Hooks.set(env, hooksSet);
  const hooks = new Hooks(Hooks.get(env)) as Hooks<TFilters, TActions>;
  hooks.init();

  return hooks;
};
