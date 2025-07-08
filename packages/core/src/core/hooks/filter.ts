import type * as types from "../../types";

export class Filter<TFilters = types.hooks.Filters> {
  private filterMap: Map<keyof TFilters, Array<TFilters[keyof TFilters]>> =
    new Map();

  addCommand<T1, T2 = null>(
    command: types.hooks.CommandFilter<T1, T2>,
    listener: T2 extends null ? (args: T1) => T1 : (args0: T1, args1: T2) => T1,
    priority = 99
  ) {
    const name = command.id;
    return this.add(name as any, listener as any, priority);
  }

  add<T extends keyof TFilters>(
    name: T,
    listener: TFilters[T],
    priority: number = 99
  ) {
    const listeners = this.filterMap.get(name) ?? [];

    // Check duplicate
    if (listeners.filter((l) => l === listener).length > 0) {
      return () => {
        this.remove(name, listener);
      };
    }

    // Insert listener with priority
    if (priority < 0) {
      priority = 0; // Adjust to the beginning of the array
    } else if (priority > listeners.length) {
      priority = listeners.length; // Adjust to the end of the array
    }
    listeners.splice(priority, 0, listener);

    this.filterMap.set(name, listeners);

    return () => {
      this.remove(name, listener);
    };
  }

  remove<T extends keyof TFilters>(name: T, listener: TFilters[T]) {
    const listeners = this.filterMap.get(name);
    if (!listeners) {
      return;
    }
    this,
      this.filterMap.set(
        name,
        listeners.filter((l) => l !== listener)
      );
  }

  async asyncCommandApply<T1, T2 = null>(
    command: T1 extends Promise<any>
      ? Awaited<types.hooks.CommandFilter<T1, T2>>
      : never,
    ...args: T2 extends null ? [Awaited<T1>] : [Awaited<T1>, T2]
  ): Promise<Awaited<T1>> {
    // eslint-disable-next-line prefer-const
    let [initialValue, ...rest] = args as any;
    let result = initialValue as any;

    for (const filter of this.filterMap.get(command.id as any) ?? []) {
      result = await (filter as any)(result, ...rest);
    }

    return result;
  }

  async asyncApply<T extends keyof TFilters>(
    name: T,
    ...args: Parameters<
      TFilters[T] extends (...args: any) => any ? TFilters[T] : never
    >
  ) {
    // eslint-disable-next-line prefer-const
    let [initialValue, ...rest] = args as any;
    let result = initialValue as any;

    for (const filter of this.filterMap.get(name) ?? []) {
      result = await (filter as any)(result, ...rest);
    }

    return result as TFilters[T] extends (...args: any) => Promise<infer R>
      ? R
      : never;
  }

  applyCommand<T1, T2 = null>(
    command: T1 extends Promise<any>
      ? never
      : types.hooks.CommandFilter<T1, T2>,
    ...args: T2 extends null ? [T1] : [T1, T2]
  ): T1 {
    // eslint-disable-next-line prefer-const
    let [initialValue, ...rest] = args as any;
    let result = initialValue as any;

    for (const filter of this.filterMap.get(command.id as any) ?? []) {
      result = (filter as any)(result, ...rest);
    }

    return result;
  }

  apply<T extends keyof TFilters>(
    name: T,
    ...args: Parameters<
      TFilters[T] extends (...args: any) => any ? TFilters[T] : never
    >
  ) {
    // eslint-disable-next-line prefer-const
    let [initialValue, ...rest] = args as any;
    let result = initialValue as any;

    for (const filter of this.filterMap.get(name) ?? []) {
      result = (filter as any)(result, ...rest);
    }

    return result as TFilters[T] extends (...args: any) => infer R ? R : never;
  }
}
