/* eslint-disable @typescript-eslint/no-unused-vars */
import { HooksCommand } from "../core/hooks/hooks-command";
import type * as types from "../types";

export const createFilterCommand = <T1, T2 = null>() => {
  return HooksCommand.createFilter() as types.hooks.CommandFilter<T1, T2>;
};

export const createNamedFilterCommand = <
  T1 extends Parameters<typeof HooksCommand.createNamedFilter>[0]
>(
  name: T1
) => {
  return HooksCommand.createNamedFilter(
    name
  ) as types.hooks.FiltersReturnType<T1> extends Promise<any>
    ? types.hooks.CommandFilter<
        Promise<types.hooks.FilterParameters<T1>[0]>,
        types.hooks.CommandFilterSecondParam<T1>
      >
    : types.hooks.CommandFilter<
        types.hooks.FilterParameters<T1>[0],
        types.hooks.CommandFilterSecondParam<T1>
      >;
};

export const createActionCommand = <P>() => {
  return HooksCommand.createAction() as types.hooks.CommandAction<P>;
};

export const createNamedActionCommand = <
  T1 extends Parameters<typeof HooksCommand.createNamedAction>[0]
>(
  name: T1
) => {
  return HooksCommand.createNamedAction(name) as types.hooks.CommandAction<
    types.hooks.ActionParameters<T1>
  >;
};
