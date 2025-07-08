import {
  REFLECT_METADATA_KEY_COMPONENT,
  REFLECT_METADATA_KEY_COMPONENT_ARGUMENTS,
} from "../constants";
import { Scope } from "../constants/scope";
import { component } from "../decorators/component";
import { Constructor } from "../types/common";
import { AsyncInitReflect } from "./async-init-reflect";

@component()
export class Components {
  private static globalInstanceMap: Record<string, WeakMap<any, any>> = {};
  private instanceMap: WeakMap<any, any> = new WeakMap();

  constructor(private env: string = "default") {
    if (!Components.globalInstanceMap[env]) {
      Components.globalInstanceMap[env] = new WeakMap();
    }
    this.register(Components, this);
  }

  register(target: any, instance: any) {
    if (!instance?.__scope) {
      instance.__scope =
        Reflect.getMetadata(REFLECT_METADATA_KEY_COMPONENT, target)?.scope ??
        Scope.Context;
    }

    instance.__scope === Scope.Context
      ? this.instanceMap.set(target, instance)
      : Components.globalInstanceMap[this.env].set(target, instance);
  }

  async asyncGetWithArgs<T>(target: Constructor<T>, ...args: Array<any>) {
    return this.asyncGet<T>(target, args);
  }

  getWithArgs<T>(target: Constructor<T>, ...args: Array<any>) {
    return this.get<T>(target, args);
  }

  async asyncGet<T>(
    target: Constructor<T>,
    constructorArgs: Array<any> = [],
    args: Record<string, any> = {}
  ): Promise<T> {
    const instance = this.get(target, constructorArgs, args);

    const asyncInit = AsyncInitReflect.get(instance, target);

    if (!asyncInit) {
      return new Promise((ok) => ok(instance));
    }

    return asyncInit.then(() => instance);
  }

  get<T>(
    target: Constructor<T>,
    constructorArgs: Array<any> = [],
    args: Record<string, any> = {}
  ): T {
    if (!target) {
      return undefined as T;
    }

    let componentsOptions =
      Reflect.getMetadata(REFLECT_METADATA_KEY_COMPONENT, target) ?? {};

    args = {
      failFast: false,
      forceToInstantiate: false,
      instantiatedByQueryBuilders: false,
      ...args,
      depth: args?.depth ?? 0,
    };

    if (!args.refList) {
      args.refList = new WeakMap();
    }

    componentsOptions = {
      scope: Scope.Context,
      injectable: false,
      ...componentsOptions,
    };

    if (!componentsOptions.injectable) {
      if (!args.failFast) {
        throw new Error(`Target not found`);
      }
      return undefined as T;
    }

    let instance: any;
    const instanceMap = (() => {
      if (Scope.Transient === componentsOptions.scope) {
        return undefined;
      }

      return Scope.Singleton === componentsOptions.scope
        ? Components.globalInstanceMap[this.env]
        : this.instanceMap;
    })();

    if (instanceMap) {
      instance = instanceMap.get(target);

      if (instance && !args.forceToInstantiate) {
        return instance;
      }
    }

    const dependencies = Reflect.getMetadata("design:paramtypes", target) || [];

    const instances = [];
    const argsPassedByDecorator: Map<number, any> | undefined =
      Reflect.getMetadata(REFLECT_METADATA_KEY_COMPONENT_ARGUMENTS, target);

    for (const [index, dep] of dependencies.entries()) {
      const refTarget = args.refList.get(dep);
      if (refTarget) {
        instances.push(refTarget);
      } else {
        instances.push(
          this.get(dep, argsPassedByDecorator?.get(index) ?? [], {
            failFast: true,
            depth: args.depth + 1,
            refList: args.refList,
          })
        );
      }
    }

    instance = new target(
      ...[
        ...instances.filter((i: any) => typeof i !== "undefined"),
        ...constructorArgs,
      ]
    );

    if ("queryBuilder" === componentsOptions.componentType) {
      if (args.depth > 0) {
        throw Error("Can't inject query builder in query builder");
      }
    }

    instance.__scope = componentsOptions;

    instanceMap?.set(target, instance);

    return instance;
  }
}
