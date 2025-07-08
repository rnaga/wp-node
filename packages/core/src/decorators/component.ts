import { Scope } from "../constants";
import {
  REFLECT_METADATA_KEY_COMPONENT,
  REFLECT_METADATA_KEY_COMPONENT_ARGUMENTS,
} from "../constants/component";

type Options = {
  componentType: string;
  scope: Scope;
  injectable: true;
} & Record<string, any>;

export function component<T extends object>(params?: Partial<Options>) {
  return (target: T) => {
    const options = {
      componentType: "default",
      scope: Scope.Context,
      ...params,
      injectable: true,
    } as const satisfies Options;

    const scope = options.scope;

    // Check scope
    // e.g.
    // - if Singleton, then all dpendencies must be Singleton
    // - if Transient, then dpendencies can be either Singleton or Transient
    const dependencies = Reflect.getMetadata("design:paramtypes", target) || [];

    const invalidDependencies = dependencies.filter((dep: any) => {
      if (!dep) {
        return false;
      }
      const depOptions =
        Reflect.getMetadata(REFLECT_METADATA_KEY_COMPONENT, dep) ?? {};
      return scope < depOptions?.scope; // ?? Scope.Transient;
    });

    if (invalidDependencies.length > 0) {
      throw new Error(
        `${
          (target as any).name
        } has dependencies with invalid scope: ${invalidDependencies.map(
          (dep: any) => dep?.name
        )}`
      );
    }

    Reflect.defineMetadata(REFLECT_METADATA_KEY_COMPONENT, options, target);
  };
}

// Define a parameter decorator factory
export function args(...args: any) {
  return function parameterDecorator(
    target: any,
    propertyKey: any,
    parameterIndex: number
  ) {
    const argsMap: Map<number, any> =
      Reflect.getMetadata(REFLECT_METADATA_KEY_COMPONENT_ARGUMENTS, target) ??
      new Map<number, any>();

    argsMap.set(parameterIndex, args);

    Reflect.defineMetadata(
      REFLECT_METADATA_KEY_COMPONENT_ARGUMENTS,
      argsMap,
      target
    );
  };
}

export const queryBuilder = (...args: any) =>
  component({ scope: Scope.Transient, ...args, componentType: "queryBuilder" });

export const transactions = (...args: any) =>
  component({ scope: Scope.Transient, ...args, componentType: "transactions" });
