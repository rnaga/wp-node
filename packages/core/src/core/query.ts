import { Scope } from "../constants";
import { component } from "../decorators/component";
import { QueryBuilders } from "../query-builder";
import { Validator } from "./validator";

import type * as types from "../types";

type builderFunction = (
  query: types.QueryBuilder,
  builders: QueryBuilders
) => void;

@component({ scope: Scope.Transient })
export class Query {
  #query: types.QueryBuilder;
  constructor(private builders: QueryBuilders, private validator: Validator) {
    this.#query = this.builders.queryBuilder;
  }

  build(fn: builderFunction) {
    fn(this.#query, this.builders);
    return this;
  }

  async execute<T extends types.validating.Parser>(validating?: T) {
    const result = await this.#query;
    return (
      !validating ? result : this.validator.execSafe(validating, result)
    ) as types.validating.ParserReturnType<T>;
  }
}
