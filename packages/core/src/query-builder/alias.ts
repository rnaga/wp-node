import type { Columns, TableNames } from "../types/database";
import { Scope, TABLE_NAMES } from "../constants";
import { Tables } from "../core/tables";
import { component } from "../decorators/component";

@component({ scope: Scope.Transient })
export class Alias<T extends string = any> {
  static count = 0;
  #index: number;
  constructor(private tables: Tables) {
    this.#index = Alias.count++;
    this.get = this.get.bind(this);
    this.as = this.as.bind(this);
    this.column = this.column.bind(this);
  }

  cloneIndex(alias: Alias) {
    alias.#index = this.#index;
  }

  private guess(table: string) {
    if (TABLE_NAMES.includes(table as any)) {
      return this.tables.get(table);
    }
    return table;
  }

  get(key: T | TableNames): { table: string; key: string } {
    const table = this.guess(key);
    return {
      table,
      key: `${key}_${this.#index}`,
    };
  }

  as(key: TableNames): string;
  as(key: TableNames, alias: T): string;
  as(key: T, alias: string): string;
  as(key: T): string;
  as(key: any, alias?: any): string {
    const { table, key: keyIndex } = this.get(key);
    if (alias) {
      return `${table} as ${keyIndex}_${alias}`;
    }
    return `${table} as ${keyIndex}`;
  }

  column<K extends TableNames>(key: K, col: Columns<K>): string;
  column<K extends TableNames>(key: K, col: Columns<K>, alias: T): string;
  column<K extends TableNames>(key: K, col: string): string;
  column(key: T, col: string, alias: string): string;
  column(key: T, col: string): string;
  column(key: any, col: any, alias?: any): string {
    const { key: keyIndex } = this.get(key);
    if (alias) {
      return `${keyIndex}_${alias}.${col}`;
    }
    return `${keyIndex}.${col}`;
  }
}
