import type * as types from "../../types";

export class HooksCommand {
  static #idFilter: number = 0;
  static #idAction: number = 0;

  static createFilter<T1, T2 = null>(): types.hooks.CommandFilter<T1, T2> {
    return {
      id: `__command_LmnOp_filter_${this.#idFilter++}`,
    } as types.hooks.CommandFilter<T1, T2>;
  }

  static createNamedFilter<T1 extends keyof types.hooks.Filters>(name: T1) {
    return {
      id: name,
    } as types.hooks.FiltersReturnType<T1> extends Promise<any>
      ? types.hooks.CommandFilter<
          Promise<types.hooks.FilterParameters<T1>[0]>,
          types.hooks.CommandFilterSecondParam<T1>
        >
      : types.hooks.CommandFilter<
          types.hooks.FilterParameters<T1>[0],
          types.hooks.CommandFilterSecondParam<T1>
        >;
  }

  static createAction<P>(): types.hooks.CommandAction<P> {
    return {
      id: `__command_LmnOp_action_${this.#idAction++}`,
    } as types.hooks.CommandAction<P>;
  }

  static createNamedAction<T1 extends keyof types.hooks.Actions>(name: T1) {
    return {
      id: name,
    } as types.hooks.CommandAction<types.hooks.ActionParameters<T1>>;
  }
}
