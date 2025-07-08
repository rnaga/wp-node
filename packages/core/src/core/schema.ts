import { Config } from "../config";
import { DEFAULT_DATABASE_TABLES, Scope } from "../constants";
import { component } from "../decorators/component";
import { SchemaBuilder } from "../schema-builder/schema-builder";

import type * as types from "../types";
type SchemaScope = "all" | "blog" | "global" | "ms_global";

@component({ scope: Scope.Transient })
export class Schema {
  constructor(private schemaBuilder: SchemaBuilder, private config: Config) {}

  usingBlog(id: number) {
    this.schemaBuilder.tables.index = id;
    return this;
  }

  // dbDelta / make_db_current_silent / wp_get_db_schema
  async build(scope: SchemaScope | "" = "all") {
    let tableNames: types.TableNames[] = [];
    switch (scope) {
      case "blog":
        tableNames = DEFAULT_DATABASE_TABLES.blog;
        break;
      case "global":
        tableNames = [
          ...DEFAULT_DATABASE_TABLES.global,
          ...(this.config.isMultiSite()
            ? DEFAULT_DATABASE_TABLES.ms_global
            : []),
        ];
        break;
      case "ms_global":
        tableNames = DEFAULT_DATABASE_TABLES.ms_global;
        break;
      case "all":
      default:
        tableNames = [
          ...DEFAULT_DATABASE_TABLES.global,
          ...DEFAULT_DATABASE_TABLES.blog,
          ...(this.config.isMultiSite()
            ? DEFAULT_DATABASE_TABLES.ms_global
            : []),
        ];
        break;
    }

    for (const tableName of tableNames) {
      const builderList = await this.schemaBuilder.get(tableName);
      for (const builder of builderList) {
        await builder;
      }
    }
  }

  // Part of wp_uninitialize_site
  async dropBlog(blogId: number) {
    const currentBlogId = this.schemaBuilder.tables.index;

    if (blogId !== currentBlogId) {
      this.usingBlog(blogId);
    }

    const tableNames = DEFAULT_DATABASE_TABLES.blog;
    for (const tableName of tableNames) {
      await this.schemaBuilder.drop(tableName);
    }

    if (blogId !== currentBlogId) {
      this.usingBlog(currentBlogId);
    }
  }
}
