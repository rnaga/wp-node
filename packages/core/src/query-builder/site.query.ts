import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { MetaQuery } from "./meta.query";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

@queryBuilder()
export class SiteQuery extends QueryBuilder<SiteQuery> {
  #metaJoined = false;
  readonly table = "site";
  constructor(
    public alias: Alias,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, SiteQuery);
  }

  get from() {
    this.builder.table(this.alias.as("site"));
    return this;
  }

  get(s: string | number) {
    if (typeof s === "number") {
      this.where("id", s);
    } else {
      this.where("domain", s);
    }
    this.builder.first();

    return this;
  }

  withMeta(type: "inner" | "right" = "right") {
    if (this.#metaJoined) {
      return this;
    }
    const meta = this.builders.get(MetaQuery, this.builder, this.alias);
    meta.setPrimaryTable("site").from.joinPrimary(type);
    this.#metaJoined = true;
    return this;
  }

  whereIn(
    column: types.Columns<"site"> | "meta_key" | "meta_value",
    values: Array<string | number>
  ) {
    this.where(column, values);
    return this;
  }

  where(
    column: types.Columns<"site"> | "meta_key" | "meta_value" | "site_id",
    value: string | number | Array<string | number>,
    op: string = "="
  ) {
    const { column: toColumn } = this.alias;
    if (Array.isArray(value)) {
      op = "in";
    }
    this.builder.where(
      toColumn(
        (column == "meta_key" || column == "meta_value" || column == "site_id"
          ? "sitemeta"
          : "site") as any,
        column
      ),
      op,
      value
    );

    return this;
  }

  whereLike(
    column: types.Columns<"site">,
    value: string,
    options?: { not: boolean }
  ) {
    const { column: toColumn } = this.alias;

    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereILike(toColumn("site", column), `%${value}%`);
    return this;
  }

  whereNotLike(column: types.Columns<"site">, value: string) {
    return this.whereLike(column, value, { not: true });
  }
}
