import { REFLECT_METADATA_KEY_ASYNC_INIT } from "../constants";

export class AsyncInitReflect {
  static define(
    target: any,
    propertyKey: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(
      REFLECT_METADATA_KEY_ASYNC_INIT,
      propertyKey,
      target.constructor
    );
  }

  static get(instance: any, target: any): Promise<any> | void {
    const propertyKey = Reflect.getMetadata(
      REFLECT_METADATA_KEY_ASYNC_INIT,
      target
    );

    return propertyKey && instance[propertyKey] instanceof Function
      ? instance[propertyKey].apply(instance)
      : undefined;
  }
}
