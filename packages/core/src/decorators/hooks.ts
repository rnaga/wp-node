import type * as types from "../types/";

import { HooksReflect } from "../core/hooks/hooks-reflect";

export function hook(name: string) {
  return function (target: any) {
    // name should be unique across all hooks
    target.__name = name;
  };
}

export function filter<
  T extends Record<string, any> = types.hooks.Filters,
  K extends keyof T = keyof T
>(eventName: K, priority: number = 99) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T[K]>
  ) {
    HooksReflect.defineFilter(String(eventName), priority, [
      target,
      propertyKey,
      descriptor,
    ]);
  };
}

export function action<
  T extends Record<string, any> = types.hooks.Actions,
  K extends keyof T = keyof T
>(eventName: K) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T[K]>
  ) {
    HooksReflect.defineAction(String(eventName), [
      target,
      propertyKey,
      descriptor,
    ]);
  };
}
