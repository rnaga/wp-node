import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

type TableNames = Extract<
  types.TableNames,
  "links" | "registration_log" | "signups"
>;

@queryBuilder()
export class CommonQuery<T extends TableNames> extends QueryBuilder<
  CommonQuery<T>
> {
  table?: T;
  constructor(
    public alias: Alias,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, CommonQuery);
  }

  withTable(tableName: T) {
    this.table = tableName;
    return this;
  }

  get from() {
    if (!this.table) {
      return this;
    }
    this.builder.table(this.alias.as(this.table));
    return this;
  }

  where(
    column: types.Columns<T>,
    value: string | number | Array<string | number>,
    op: string = "="
  ) {
    const { column: toColumn } = this.alias;
    if (Array.isArray(value)) {
      op = "in";
    }
    this.builder.where(toColumn<any>(this.table, column), op, value);
    return this;
  }

  whereIn(column: types.Columns<T>, values: Array<string | number>) {
    this.where(column, values);
    return this;
  }
}
