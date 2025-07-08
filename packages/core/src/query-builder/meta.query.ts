import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

type ValueType =
  | "NUMERIC"
  | "BINARY"
  | "CHAR"
  | "DATE"
  | "DATETIME"
  | "DECIMAL"
  | "SIGNED"
  | "TIME"
  | "UNSIGNED";

@queryBuilder()
export class MetaQuery extends QueryBuilder<MetaQuery> {
  #valueType: ValueType = "CHAR";
  constructor(
    public alias: Alias,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder,
    private table: `${types.MetaTable}meta`,
    private primaryTable: "site" | `${Exclude<types.MetaTable, "site>">}s`,
    private columns: {
      primary: string;
      meta: string;
    }
  ) {
    super(alias, builders, builder, MetaQuery);
  }

  setPrimaryTable(table: types.MetaTable) {
    this.columns = {
      primary:
        "post" === table || "user" === table
          ? "ID"
          : "site" === table
          ? "id"
          : `${table}_id`,
      meta: `${table}_id`,
    };
    this.primaryTable = table == "site" ? "site" : `${table}s`;
    this.table = `${table}meta`;

    return this;
  }

  get from() {
    this.builder.from(this.alias.as(this.table));
    return this;
  }

  select(columns: Array<types.MetaColumns>) {
    this.builder.select(columns);
    return this;
  }

  valueType(type: ValueType) {
    if (
      !type.match(
        /^(?:BINARY|CHAR|DATE|DATETIME|SIGNED|UNSIGNED|TIME|NUMERIC(?:(d+(?:,s?d+)?))?|DECIMAL(?:(d+(?:,s?d+)?))?)$/
      )
    ) {
      type = "CHAR";
    }
    this.#valueType = "NUMERIC" === type ? "SIGNED" : type;
    return this;
  }

  joinPrimary(type: "left" | "inner" | "right" = "inner") {
    const { as, column } = this.alias;
    this.builder[`${type}Join`](
      as(this.primaryTable),
      column(this.table, this.columns.meta),
      column(this.primaryTable, this.columns.primary)
    );
    return this;
  }

  withIds(
    ids: number[],
    options?: {
      joinPrimary?: boolean;
      not?: boolean;
    }
  ) {
    const { joinPrimary = true } = options ?? {};
    this.builder.clear("join");
    if (joinPrimary) {
      this.joinPrimary();
    }

    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereIn(
      //this.alias.column(this.primaryTable, this.columns.primary),
      this.alias.column(this.table, this.columns.meta),
      ids
    );
    return this;
  }

  onNotExists(
    column: Extract<types.MetaColumns, "meta_key" | "meta_value">,
    value: string | number
  ) {
    return this.onExists(column, value, true);
  }

  onExists(
    column: Extract<types.MetaColumns, "meta_key" | "meta_value">,
    value: string | number,
    not: boolean = false
  ) {
    this.builder.clear("join");

    const { column: toColumn, as } = this.alias;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    this.builder[not ? "leftJoin" : "innerJoin"](
      as(this.primaryTable),
      function (qb) {
        qb.on(
          toColumn(self.table, self.columns.meta),
          toColumn(self.primaryTable, self.columns.primary)
        )[not ? "onNotExists" : "onExists"](function () {
          this.select(toColumn(self.table, self.columns.meta))
            .from(as(self.table))
            .where(toColumn(self.table, column), value)
            .limit(1);
        });
      }
    );
    return this;
  }

  private castValue(v: string | number, as: ValueType = this.#valueType) {
    return this.builders.raw(`CAST(? as ${as})`, [v]);
  }

  whereKeyLike(value: string, options?: { not: boolean }) {
    const { column } = this.alias;
    if (options?.not === true) {
      this.builder.not.whereILike(column(this.table, "meta_key"), `%${value}%`);
    } else {
      this.builder.whereILike(column(this.table, "meta_key"), `%${value}%`);
    }

    return this;
  }

  whereKeyNotLike(value: string) {
    return this.whereKeyLike(value, { not: true });
  }

  whereLike(key: string, value: string | number, options?: { not: boolean }) {
    const { column } = this.alias;
    this.builder.andWhere((subBuilder) => {
      subBuilder.where(column(this.table, "meta_key"), key);

      if (options?.not === true) {
        subBuilder.not;
      }

      subBuilder.whereILike(column(this.table, "meta_value"), `%${value}%`);
    });

    return this;
  }

  whereNotLike(key: string, value: string | number) {
    return this.whereLike(key, value, { not: true });
  }

  whereIn(key: string, obj: Array<string | number>) {
    const { column } = this.alias;
    this.builder.andWhere((subBuilder) => {
      subBuilder
        .where(column(this.table, "meta_key"), key)
        .whereIn(column(this.table, "meta_value"), obj);
    });
    return this;
  }

  whereBetween(key: string, range: [number | string, number | string]) {
    const { column } = this.alias;
    this.builder.andWhere((subBuilder) => {
      subBuilder
        .where(column(this.table, "meta_key"), key)
        .whereBetween(column(this.table, "meta_value"), range);
    });
    return this;
  }

  withKeys(keys: string[]) {
    const { column } = this.alias;
    this.builder.andWhere((subBuilder) => {
      for (const key of keys) {
        subBuilder.orWhere(column(this.table, "meta_key"), key);
      }
    });
    return this;
  }

  where(key: string, value?: string | number, op: string = "=") {
    const { column } = this.alias;
    //this.builder.where(toColumn(this.table, column), op, this.castValue(value));
    this.builder.andWhere((subBuilder) => {
      subBuilder.where(column(this.table, "meta_key"), key);
      if (value) {
        subBuilder.where(
          column(this.table, "meta_value"),
          op,
          value
          //this.castValue(value)
        );
      }
    });
    return this;
  }

  regex(key: string, regex: RegExp) {
    const { column } = this.alias;
    const value =
      this.#valueType === "BINARY"
        ? this.castValue(regex.source)
        : `'${regex.source}'`;
    this.builder.andWhere((subBuilder) => {
      subBuilder
        .where(column(this.table, "meta_key"), key)
        .whereRaw(`?? REGEXP ${value}`, [column(this.table, "meta_value")]);
    });
    return this;
  }
}
