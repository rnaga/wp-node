import { Knex } from "knex";
import * as database from "./database";
import { Tables } from "../core/tables";
import { Config } from "../config";

export type Schema<T extends database.TableNames> = {
  name: T;
  columns: (
    table: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
    config?: Config
  ) => Record<database.Columns<T>, Knex.ColumnBuilder | undefined>;
  indexes?: (
    table: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
    columns: database.Columns<T> | string[]
  ) => void;
  raw?: (
    builder: (sql: string, biding: string[]) => void,
    tables: Tables,
    columns: database.Columns<T> | string[]
  ) => void;
};
