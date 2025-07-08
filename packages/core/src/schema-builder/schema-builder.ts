import { Knex } from "knex";

import { Config } from "../config";
import { Scope } from "../constants";
import { Tables } from "../core/tables";
import Database from "../database";
import { component } from "../decorators/component";
import { createFluentProxy } from "./proxy";
import * as schema from "./schema";

import type * as types from "../types";

@component({ scope: Scope.Transient })
export class SchemaBuilder {
  static schema: Record<types.TableNames, types.Schema<types.TableNames>>;
  constructor(
    private database: Database,
    private config: Config,
    public tables: Tables
  ) {}

  private getDefinition(name: types.TableNames) {
    return SchemaBuilder.schema[name];
  }

  static add(
    schema: Record<types.TableNames, types.Schema<types.TableNames>>
  ): void;
  static add(schema: Record<string, types.Schema<types.TableNames>>): void {
    SchemaBuilder.schema = { ...SchemaBuilder.schema, ...schema };
  }

  private async tableExists(tableName: types.TableNames) {
    return await this.database.schema.hasTable(this.tables.get(tableName));
  }

  private async getColumnNamesFromExistingTable(tableName: types.TableNames) {
    const columnInfo = await this.database
      .connection(this.tables.get(tableName))
      .columnInfo();

    return Object.keys(columnInfo);
  }

  private getColumnNamesFromSchemaDefinition(tableName: types.TableNames) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [proxy, calls] = createFluentProxy();

    // Get keys and save chaining methods defined for columns
    const columns = this.getDefinition(tableName).columns(
      proxy as any,
      this.config
    ) as Record<string, any>;

    const keys: string[] = [];
    Object.entries(columns).forEach(([key, value]) => value && keys.push(key));
    return keys;
  }

  private buildColumns(
    tableName: types.TableNames,
    tableBuilder: Knex.AlterTableBuilder | Knex.CreateTableBuilder,
    targetColumns: string[]
  ) {
    const [proxy, calls] = createFluentProxy();

    // Get keys and save chaining methods defined for columns
    this.getDefinition(tableName).columns(proxy as any, this.config);

    let include: boolean = true;
    let currentColumBuilder: { name: string; instance: any } = {
      name: "",
      instance: undefined,
    };
    let currentColumnName: string = "";

    for (const { method, args } of calls) {
      // Method is to initialize Knex.ColumnBuilder
      if (typeof (tableBuilder as any)[method] !== "undefined") {
        currentColumnName = args[0];

        // Check if the column should be added
        include = targetColumns.includes(currentColumnName);
      }

      if (include) {
        // Initialize new ColumnBuilder
        if (currentColumnName !== currentColumBuilder.name) {
          currentColumBuilder = {
            name: currentColumnName,
            // Initialize new Knex.ColumnBuilder
            instance: (tableBuilder as any)[method](...args),
          };
        } else {
          // Call method for ColumnBuilder
          currentColumBuilder.instance[method](...args);
        }
      }
    }
  }

  async get<T extends types.TableNames>(tableName: T) {
    const columnNamesFromSchemaDefinition =
      this.getColumnNamesFromSchemaDefinition(tableName);
    let targetColumns = columnNamesFromSchemaDefinition;

    const builders: Array<Knex.SchemaBuilder | Knex.Raw> = [];
    let builder: Knex.SchemaBuilder | Knex.Raw;

    // Columns
    if (await this.tableExists(tableName)) {
      const columnNamesfromExistingTable =
        await this.getColumnNamesFromExistingTable(tableName);

      targetColumns = columnNamesFromSchemaDefinition.filter(
        (key) => !columnNamesfromExistingTable.includes(key as any)
      );

      if (0 >= targetColumns.length) {
        return [];
      }

      // Alter Table
      builder = this.database.schema.alterTable(
        this.tables.get(tableName),
        (table) => {
          this.buildColumns(tableName, table, targetColumns);
        }
      );
    } else {
      // Create Table
      builder = this.database.schema.createTable(
        this.tables.get(tableName),
        (table) => {
          this.buildColumns(tableName, table, targetColumns);
          table.collate(this.config.config.tableCollate);
          table.charset(this.config.config.tableCharset);
        }
      );
    }

    builders.push(builder);

    const definition = this.getDefinition(tableName);

    // Indexes
    if (definition.indexes) {
      const indexes = definition.indexes;
      builder = this.database.schema.alterTable(
        this.tables.get(tableName),
        (table) => {
          indexes(table, targetColumns);
        }
      );
      builders.push(builder);
    }

    // Raw queries
    if (definition.raw) {
      const raw = definition.raw;
      const sqls: any[] = [];

      const rawQuery = (sql: string, binding: string[]) => {
        sqls.push([sql, binding]);
      };

      raw(rawQuery, this.tables, targetColumns);

      if (0 < sqls.length) {
        for (const sql of sqls) {
          builder = this.database.connection.raw(sql[0], sql[1]);
        }
        builders.push(builder);
      }
    }

    return builders;
  }

  drop(tableName: types.TableNames): Knex.SchemaBuilder;
  drop(tableName: string) {
    return this.database.schema.dropTable(this.tables.get(tableName));
  }
}

SchemaBuilder.add({
  blogmeta: schema.blogMeta,
  blogs: schema.blogs,
  commentmeta: schema.commentMeta,
  comments: schema.comments,
  links: schema.links,
  options: schema.options,
  postmeta: schema.postMeta,
  posts: schema.posts,
  registration_log: schema.registrationLog,
  signups: schema.signups,
  site: schema.site,
  sitemeta: schema.siteMeta,
  term_relationships: schema.termRelationships,
  term_taxonomy: schema.termTaxonomy,
  termmeta: schema.termMeta,
  terms: schema.terms,
  usermeta: schema.userMeta,
  users: schema.users,
});
