import { AsyncInitReflect } from "../core/async-init-reflect";

export function asyncInit(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  AsyncInitReflect.define(target, propertyKey, descriptor);
}
