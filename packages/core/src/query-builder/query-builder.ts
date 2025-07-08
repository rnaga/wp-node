import { Alias } from "./alias";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

export abstract class QueryBuilder<T> {
  constructor(
    public alias: Alias,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder,
    public clazz: types.Constructor<T>
  ) {}

  abstract get from(): this;

  get or() {
    this.builder.or.__ref(this);
    return this;
  }

  get not() {
    this.builder.not.__ref(this);
    return this;
  }

  count<T extends keyof types.Tables>(table: T, column: types.Columns<T>) {
    const { column: toColumn } = this.alias;
    this.builder
      .clear("select")
      .clear("offset")
      .clear("group")
      .countDistinct(`${toColumn(table, column)} as count`)
      .first();
    return this;
  }

  countGroupby<T extends keyof types.Tables>(
    table: T,
    column: types.Columns<T>
  ) {
    const { column: toColumn } = this.alias;
    this.builder
      .clear("select")
      .clear("offset")
      .clear("group")
      .select(`${toColumn(table, column)} as ${column.toString()}`)
      .count(`${toColumn(table, column)} as count`)
      .groupBy(toColumn(table, column));
    return this;
  }

  andWhere(fn: (query: T) => void, alias?: Alias) {
    this.builder.andWhere((subBuilder) => {
      const query = this.builders.get(
        this.clazz,
        subBuilder,
        alias ?? this.alias
      );
      fn(query);
    });
    return this;
  }

  andWhereNot(func: (query: T) => void, alias?: Alias) {
    this.builder.not.__ref(this).andWhere(func, alias);
    return this;
  }

  orWhere(fn: (query: T) => void, alias?: Alias) {
    this.builder.orWhere((subBuilder) => {
      const query = this.builders.get(
        this.clazz,
        subBuilder,
        alias ?? this.alias
      ) as T;
      fn(query);
    });
    return this;
  }

  orWhereNot(func: (query: T) => void, alias?: Alias) {
    this.builder.not.__ref(this).orWhere(func, alias);
    return this;
  }

  usingQuery<T>(target: types.Constructor<T>, alias?: Alias) {
    return this.builders.get(target, this.builder, alias) as T;
  }
}
