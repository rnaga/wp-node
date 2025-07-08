import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";
import { MetaQuery } from "./meta.query";

@queryBuilder()
export class TermsQuery extends QueryBuilder<TermsQuery> {
  readonly table = "terms";
  constructor(
    public alias: Alias<"cte_terms" | "c" | "c2">,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, TermsQuery);
  }

  get from() {
    const { column, as } = this.alias;
    this.builder
      .innerJoin(
        as("term_taxonomy"),
        column("terms", "term_id"),
        column("term_taxonomy", "term_id")
      )
      // .leftJoin(
      //   as("term_relationships"),
      //   column("term_taxonomy", "term_taxonomy_id"),
      //   column("term_relationships", "term_taxonomy_id")
      // )
      .from(as(this.table))
      .distinct();
    //.select(column("terms", "term_id"));
    return this;
  }

  get selectTerms() {
    const { as } = this.alias;
    this.builder
      .clear("join")
      .clear("columns")
      .clear("select")
      .from(as("terms"));
    return this;
  }

  get selectTermTaxonomy() {
    const { as } = this.alias;
    this.builder
      .clear("join")
      .clear("columns")
      .clear("select")
      .from(as("term_taxonomy"));
    return this;
  }

  get selectTermRelationships() {
    const { as } = this.alias;
    this.builder
      .clear("join")
      .clear("columns")
      .clear("select")
      .from(as("term_relationships"));
    return this;
  }

  exists(
    column: "term_id" | "name" | "slug",
    value: string | number,
    taxonomy?: string
  ) {
    this.builder.where((subBuilder) => {
      const qb = this.builders.get(TermsQuery, subBuilder, this.alias);
      qb.from.builder.where(qb.getColumn(column), value).limit(1);
      if (taxonomy) {
        qb.builder.where(qb.getColumn("taxonomy"), taxonomy);
      }
    });

    return this;
  }

  maxGroup() {
    const { column, as } = this.alias;
    return this.builder
      .clear("select")
      .clear("join")
      .clear("where")
      .max(column("terms", "term_group"), { as: "max" })
      .from(as("terms"));
  }

  get(id: number) {
    const { column } = this.alias;
    this.builder.where(column("terms", "term_id"), id).first();
    return this;
  }

  joinTermRelationships(left: string): this {
    const { as, column } = this.alias;
    this.builder.join(
      as("term_relationships"),
      left,
      column("term_relationships", "object_id")
    );
    // .innerJoin(
    //   as("term_taxonomy"),
    //   column("term_taxonomy", "term_taxonomy_id"),
    //   column("term_relationships", "term_taxonomy_id")
    // )
    // .innerJoin(
    //   as("terms"),
    //   column("terms", "term_id"),
    //   column("term_taxonomy", "term_id")
    // );

    //this.replaceBuilder(builder);
    return this;
  }

  joinTerms() {
    const { as, column } = this.alias;
    this.builder.innerJoin(
      as("terms"),
      column("terms", "term_id"),
      column("term_taxonomy", "term_id")
    );
    return this;
  }

  joinTermTaxonomy() {
    const { as, column } = this.alias;
    this.builder.innerJoin(
      as("term_taxonomy"),
      column("term_taxonomy", "term_taxonomy_id"),
      column("term_relationships", "term_taxonomy_id")
    );
    return this;
  }

  withMeta(type: "inner" | "right" = "right") {
    const { column, as } = this.alias;
    this.builder.clear("select").clear("join");
    const meta = this.builders.get(MetaQuery, this.builder, this.alias);
    meta.setPrimaryTable("term").from.joinPrimary(type);
    this.builder.innerJoin(
      as("term_taxonomy"),
      column("terms", "term_id"),
      column("term_taxonomy", "term_id")
    );

    return this;
  }

  withoutObjectIds(ids: number[]) {
    this.withObjectIds(ids, true);
    return this;
  }

  withObjectIds(ids: number[], exclude: boolean = false) {
    const { as, column } = this.alias;
    this.builder.innerJoin(
      as("term_relationships"),
      column("term_taxonomy", "term_taxonomy_id"),
      column("term_relationships", "term_taxonomy_id")
    );

    if (!exclude)
      this.builder.whereIn(column("term_relationships", "object_id"), ids);
    else
      this.builder.whereNotIn(column("term_relationships", "object_id"), ids);

    return this;
  }

  withChildren(
    column:
      | "name"
      | "slug"
      | "term_id"
      | "taxonomy"
      | "parent"
      | "term_taxonomy_id",
    obj: Array<string | number>
  ) {
    const { as, column: toColumn, get } = this.alias;

    this.builder
      .withRecursive(get("cte_terms").table, (qb) => {
        qb.select(
          toColumn("term_taxonomy", "term_taxonomy_id", "c"),
          toColumn("term_taxonomy", "term_id", "c"),
          toColumn("term_taxonomy", "parent", "c"),
          this.builders.raw("0 as depth")
        )
          .from(as("term_taxonomy", "c"))
          .join(
            as("terms", "c"),
            toColumn("term_taxonomy", "term_id", "c"),
            toColumn("terms", "term_id", "c")
          )
          .whereIn(`${this.getColumn(column, "c")}`, obj)
          .union((qb) => {
            qb.select(
              toColumn("term_taxonomy", "term_taxonomy_id", "c2"),
              toColumn("term_taxonomy", "term_id", "c2"),
              toColumn("term_taxonomy", "parent", "c2"),
              this.builders.raw(`${get("cte_terms").key}.depth + 1`)
            )
              .from(as("term_taxonomy", "c2"))
              .join(
                as("cte_terms"),
                toColumn("term_taxonomy", "parent", "c2"),
                toColumn("cte_terms", "term_taxonomy_id")
              );
          });
      })
      .join(
        as("cte_terms"),
        toColumn("term_taxonomy", "term_id"),
        toColumn("cte_terms", "term_id")
      );
    return this;
  }

  private getColumn(column: string, alias?: "cte_terms" | "c" | "c2") {
    const { get } = this.alias;
    let tableColumn;

    switch (column) {
      case "terms_relationships.term_taxonomy_id":
        column = "term_taxonomy_id";
      // eslint-disable-next-line no-fallthrough
      case "object_id":
      case "term_order":
        tableColumn = get("term_relationships").key;
        break;
      case "terms.name":
        column = "name";
        tableColumn = get("terms").key;
        break;
      case "terms.term_id":
        column = "term_id";
        tableColumn = get("terms").key;
        break;
      case "name":
      case "slug":
      case "term_group":
        tableColumn = get("terms").key;
        break;
      case "depth":
        tableColumn = get("cte_terms").key;
        break;
      default:
        tableColumn = get("term_taxonomy").key;
    }

    return alias
      ? `${tableColumn}_${alias}.${column}`
      : `${tableColumn}.${column}`;
  }

  select(
    columns:
      | "*"
      | Array<
          | Exclude<types.Columns<"terms">, "term_id">
          | Exclude<types.Columns<"term_taxonomy">, "term_id">
          | "object_id"
          | "depth"
          | "term_id"
          | "term_order"
        >
  ) {
    this.builder.clear("select"); //.select(this.getColumn("term_id"));
    if (columns === "*") {
      this.builder.distinct().select("*");
    } else {
      columns.map((c) =>
        c == "depth"
          ? this.builder.max(this.getColumn(c), { as: "depth" })
          : this.builder.select(this.getColumn(c))
      );
    }
    return this;
  }

  groupBy(
    column:
      | Exclude<types.Columns<"terms">, "term_id">
      | Exclude<types.Columns<"term_taxonomy">, "term_id">
      | "object_id"
      | "depth"
      | "term_id"
  ) {
    this.builder.groupBy(this.getColumn(column));
    return this;
  }

  whereIn(
    column:
      | Exclude<types.Columns<"term_taxonomy">, "parent">
      | types.Columns<"terms">,
    obj: Array<string | number>
  ) {
    this.where(column, obj, "in");
    return this;
  }

  where(
    column:
      | types.Columns<"terms">
      | types.Columns<"term_taxonomy">
      | "terms.term_id"
      | "terms.slug"
      | "terms.name"
      | "object_id"
      | "term_order"
      | "terms_relationships.term_taxonomy_id",
    v: string | number | Array<string | number>,
    op: string = "="
  ) {
    this.builder.where(this.getColumn(column), op, v);
    return this;
  }

  whereLike(
    column: "name" | "description" | "slug",
    search: string,
    options?: { not: boolean }
  ) {
    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereILike(this.getColumn(column), `%${search}%`);
    return this;
  }

  whereNotLike(column: "name" | "description" | "slug", search: string) {
    return this.whereLike(column, search);
  }
}
