import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { MetaQuery } from "./meta.query";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

@queryBuilder()
export class BlogsQuery extends QueryBuilder<BlogsQuery> {
  readonly table = "blogs";
  constructor(
    public alias: Alias,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, BlogsQuery);
  }

  get from() {
    this.builder.table(this.alias.as("blogs"));
    return this;
  }

  get(b: number | string) {
    if (typeof b === "number") {
      this.where("blog_id", b);
    } else {
      this.where("domain", b);
    }
    this.builder.first();

    return this;
  }

  select(columns: Array<types.Columns<"blogs"> | types.Columns<"blogmeta">>) {
    this.builder.select(columns);
    return this;
  }

  withMeta(type: "inner" | "right" = "right") {
    //this.replaceBuilder(this.metaQuery.joinPrimary(type).builder);
    const meta = this.builders.get(MetaQuery, this.builder, this.alias);
    meta.setPrimaryTable("blog").from.joinPrimary(type);
    return this;
  }

  whereIn(
    column:
      | Extract<
          types.Columns<"blogs">,
          "site_id" | "network" | "domain" | "path" | "lang_id" | "blog_id"
        >
      | "meta_key"
      | "meta_value",
    values: Array<string | number>
  ) {
    this.where(column, values);
    return this;
  }

  where(
    column: types.Columns<"blogs"> | "meta_key" | "meta_value",
    value: string | number | Array<string | number>,
    op: string = "="
  ) {
    const { column: toColumn } = this.alias;
    if (Array.isArray(value)) {
      op = "in";
    }
    this.builder.where(
      toColumn(
        (column == "meta_key" || column == "meta_value"
          ? "blogmeta"
          : "blogs") as any,
        column
      ),
      op,
      value
    );
    return this;
  }

  whereLike(
    column: types.Columns<"blogs">,
    value: string,
    options?: { not: boolean }
  ) {
    const { column: toColumn } = this.alias;

    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereILike(toColumn("blogs", column), `%${value}%`);
    return this;
  }

  whereNotLike(column: types.Columns<"blogs">, value: string) {
    return this.whereLike(column, value, { not: true });
  }
}
