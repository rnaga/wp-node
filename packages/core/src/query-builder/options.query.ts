import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

@queryBuilder()
export class OptionsQuery extends QueryBuilder<OptionsQuery> {
  readonly table = "options";
  constructor(
    public alias: Alias,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, OptionsQuery);
  }

  get from() {
    this.builder.table(this.alias.as("options"));
    return this;
  }

  get(name: string) {
    this.builder.where("option_name", name).first();
    return this;
  }

  whereIn(names: string[]) {
    this.builder.whereIn("option_name", names);
  }

  whereLike(
    column: types.Columns<"options">,
    value: string,
    options?: { not: boolean }
  ) {
    const { column: toColumn } = this.alias;

    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereILike(toColumn("options", column), `%${value}%`);
    return this;
  }

  whereNotLike(column: types.Columns<"options">, value: string) {
    return this.whereLike(column, value, { not: true });
  }
}
