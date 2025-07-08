import { validating } from "../common";
import { component } from "../decorators/component";

import type * as types from "../types";

@component()
export class Validator {
  constructor() {}

  fieldSafe<T extends types.validating.Tables, V>(
    table: T,
    field: types.validating.Field<T>,
    value: V
  ) {
    return validating.fieldSafe(table, field, value);
  }

  field<T extends types.validating.Tables, V>(
    table: T,
    field: types.validating.Field<T>,
    value: V
  ) {
    return validating.field(table, field, value);
  }

  exec<T extends types.validating.Parser>(
    func: T,
    v: types.validating.ParserReturnType<T>
  ): types.validating.ParserReturnType<T> {
    return validating.exec(func, v);
  }

  execAny<T extends types.validating.Parser>(
    func: T,
    v: any
  ): types.validating.ParserReturnType<T> {
    return validating.execAny(func, v);
  }

  execSafe<T extends types.validating.Parser>(
    func: T,
    v: types.validating.ParserReturnType<T>
  ): types.validating.ParserReturnType<T> | undefined {
    return validating.execSafe(func, v);
  }

  execSafeAny<T extends types.validating.Parser>(
    func: T,
    v: any
  ): types.validating.ParserReturnType<T> | undefined {
    return validating.execSafeAny(func, v);
  }
}
