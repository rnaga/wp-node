import "reflect-metadata";

import { Action } from "./action";
import { Filter } from "./filter";

import type * as types from "../../types";

const prefix = "__REFLECT_METADATA_KEY_HOOKS_";
export const FILTER = Symbol.for(`${prefix}FILTER__`);
export const ACTION = Symbol.for(`${prefix}ACTION__`);

type ReflectHookMap = Map<string, Array<[number, string]>>;

/**
 * Represents a class that provides reflection utilities for defining and registering hooks.
 */
export class HooksReflect {
  /**
   * Defines a hook for a given event name with the specified priority.
   *
   * @param metakey - The metadata key used for storing hook information.
   * @param eventName - The name of the event.
   * @param priority - The priority of the hook.
   * @param args - The arguments containing the target, propertyKey, and descriptor.
   */
  private static define(
    metakey: symbol,
    eventName: string,
    priority: number,
    args: [target: any, propertyKey: string, descriptor: PropertyDescriptor]
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [target, propertyKey, descriptor] = args;

    const hookMap: ReflectHookMap =
      Reflect.getMetadata(metakey, target.constructor) ?? new Map();

    const hooks = hookMap.get(eventName) ?? [];

    if (hooks.includes([priority, propertyKey])) {
      return;
    }

    hookMap.set(eventName, [...hooks, [priority, propertyKey]]);

    Reflect.defineMetadata(metakey, hookMap, target.constructor);
  }

  /**
   * Defines a filter hook for a given event name with the specified priority.
   * @param eventName - The name of the event.
   * @param priority - The priority of the hook.
   * @param args - The arguments containing the target, propertyKey, and descriptor.
   */
  public static defineFilter(
    eventName: string,
    priority: number,
    args: [target: any, propertyKey: string, descriptor: PropertyDescriptor]
  ) {
    HooksReflect.define(FILTER, eventName, priority, args);
  }

  /**
   * Defines an action hook for a given event name.
   * @param eventName - The name of the event.
   * @param args - The arguments containing the target, propertyKey, and descriptor.
   */
  public static defineAction(
    eventName: string,
    args: [target: any, propertyKey: string, descriptor: PropertyDescriptor]
  ) {
    HooksReflect.define(ACTION, eventName, 0, args);
  }

  /**
   * Registers the defined hooks for the given hook types, instance, and target.
   *
   * @param hookTypes - The hook types to register (filter and action).
   * @param instance - The instance containing the hook methods.
   * @param target - The target object to register the hooks on.
   */
  public static register<
    TFilters = types.hooks.Filters,
    TActions = types.hooks.Actions
  >(
    hookTypes: [Filter<TFilters>, Action<TActions>],
    instance: any,
    target: any
  ) {
    const [filter, action] = hookTypes;
    for (const metakey of [FILTER, ACTION]) {
      const hookMap: ReflectHookMap = Reflect.getMetadata(metakey, target);

      for (const [eventName, values] of hookMap ?? []) {
        values.forEach(([priority, propertyKey]) => {
          const listener = instance[propertyKey].bind(instance);
          if (metakey === FILTER) {
            filter.add(eventName as any, listener, priority);
          } else if (metakey === ACTION) {
            action.add(eventName as any, listener);
          }
        });
      }
    }
  }
}
