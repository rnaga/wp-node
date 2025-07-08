import type { Filters, FilterParameters } from "./filters";
export type HooksCommandPrefix = "__command_";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type CommandFilter<T1, T2 = null> = {
  id: string;
};

export type CommandFilterSecondParam<T extends keyof Filters> =
  FilterParameters<T>[1] extends NonNullable<FilterParameters<T>[1]>
    ? Exclude<FilterParameters<T>, FilterParameters<T>[0]>
    : null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type CommandAction<T> = {
  id: string;
};
