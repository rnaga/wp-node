import * as val from "../validators";
import type * as types from "../types";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace validating {
  export const fieldSafe = <T extends types.validating.Tables, V>(
    table: T,
    field: types.validating.Field<T>,
    value: V
  ) => {
    const result = (val.database.wpTables[table].shape as any)[field].safeParse(
      value
    ) as {
      success: boolean;

      data: V;
    };
    return result.success ? result.data : undefined;
  };

  export const field = <T extends types.validating.Tables, V>(
    table: T,
    field: types.validating.Field<T>,
    value: V
  ) => {
    return (val.database.wpTables[table].shape as any)[field].parse(
      value
    ) as Exclude<V, undefined>;
  };

  export const execAny = <T extends types.validating.Parser>(
    func: T,
    v: any
  ): types.validating.ParserReturnType<T> => {
    return exec(func, v);
  };

  export const exec = <T extends types.validating.Parser>(
    func: T,
    v: types.validating.ParserReturnType<T>
  ): types.validating.ParserReturnType<T> => {
    return func.parse(v);
  };

  export const execSafeAny = <T extends types.validating.Parser>(
    func: T,
    v: any
  ): types.validating.ParserReturnType<T> | undefined => {
    return execSafe(func, v);
  };

  export const execSafe = <T extends types.validating.Parser>(
    func: T,
    v: types.validating.ParserReturnType<T>
  ): types.validating.ParserReturnType<T> | undefined => {
    const result = func.safeParse(v) as {
      success: boolean;
      data: types.validating.ParserReturnType<T>;
    };

    // if (!result.success) {
    //   console.log(`BEFORE`, v, `AFTER`, result);
    //   console.info((result as any).error);
    // }
    return result.success ? result.data : undefined;
  };
}
