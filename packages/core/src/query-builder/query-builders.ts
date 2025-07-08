import { Knex, knex } from "knex";

import { Scope } from "../constants";
import { Components } from "../core/components";
import { Tables } from "../core/tables";
import Database from "../database";
import { component } from "../decorators/component";
import * as types from "../types";
import { Alias } from "./alias";

knex.QueryBuilder.extend("__ref", function <T>(ref: T) {
  return ref;
});

@component({ scope: Scope.Transient })
export class QueryBuilders {
  #refList = new Map();
  constructor(
    public database: Database,
    private components: Components,
    public tables: Tables
  ) {
    this.#refList.set(QueryBuilders, this);
    this.#refList.set(Tables, this.tables);
  }

  get queryBuilder() {
    return this.database.connection.queryBuilder();
  }

  getTableName(table: string) {
    return this.tables.get(table);
  }

  raw(raw: any, args?: any) {
    return this.database.connection.raw(raw, args ?? undefined);
  }

  get<T>(
    target: types.Constructor<T>,
    builder?: Knex.QueryBuilder,
    alias?: Alias
  ): T {
    const instance = this.components.get<T>(target, [], {
      refList: this.#refList,
    });
    (instance as any).builder = builder ?? this.queryBuilder;
    if (alias && (instance as any)?.alias) {
      alias.cloneIndex((instance as any).alias);
    }
    return instance as T;
  }
}
