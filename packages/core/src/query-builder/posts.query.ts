import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { MetaQuery } from "./meta.query";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";
import { TermsQuery } from "./terms.query";

import type * as types from "../types";
import { Knex } from "knex";

@queryBuilder()
export class PostsQuery extends QueryBuilder<PostsQuery> {
  readonly table = "posts";
  constructor(
    public alias: Alias<"cte_p" | "p" | "p2" | "cte_c" | "c" | "c2">,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, PostsQuery);
  }

  get from() {
    this.builder.table(this.alias.as("posts"));
    return this;
  }

  get(id: number) {
    const { column } = this.alias;
    this.builder.where(column("posts", "ID"), id).first();
    return this;
  }

  withMeta(type: "inner" | "right" = "right") {
    const meta = this.builders.get(MetaQuery, this.builder, this.alias);
    meta.setPrimaryTable("post").from.joinPrimary(type);
    return this;
  }

  withoutMeta(key: string, value?: string) {
    const { column } = this.alias;

    this.andWhere((query) => {
      query.builder.where(
        column("posts", "ID"),
        "not in",
        (qb: Knex.QueryBuilder) => {
          const meta = this.builders.get(MetaQuery, qb);
          meta
            .setPrimaryTable("post")
            .from.joinPrimary("inner")
            .select(["post_id"]);

          if (value) meta.where(key, value);
          else meta.withKeys([key]);
        }
      );
    });
    return this;
  }

  withChildren(id: number) {
    const { as, column: toColumn, get } = this.alias;
    this.builder
      .withRecursive(get("cte_c").table, (qb) => {
        qb.select(toColumn("posts", "ID", "c"), this.builders.raw("0 as depth"))
          .from(as("posts", "c"))
          .where(toColumn("posts", "post_parent", "c"), id)
          .union((qb) => {
            qb.select(
              toColumn("posts", "ID", "c2"),
              this.builders.raw(`${get("cte_c").key}.depth + 1`)
            )
              .from(as("posts", "c2"))
              .join(
                as("cte_c"),
                toColumn("posts", "post_parent", "c2"),
                toColumn("cte_c", "ID")
              );
          });
      })

      .select(toColumn("cte_c", "depth"), toColumn("posts", "*"))
      .join(as("cte_c"), toColumn("posts", "ID"), toColumn("cte_c", "ID"));
    return this;
  }

  withParents(id: number) {
    const { as, column: toColumn, get } = this.alias;
    this.builder
      .withRecursive(get("cte_p").table, (qb) => {
        qb.select(
          toColumn("posts", "ID", "p"),
          toColumn("posts", "post_parent", "p"),
          this.builders.raw("0 as depth")
        )
          .from(as("posts", "p"))
          .where(toColumn("posts", "ID", "p"), id)
          .where(toColumn("posts", "post_parent", "p"), ">", 0)
          .union((qb) => {
            qb.select(
              toColumn("posts", "ID", "p2"),
              toColumn("posts", "post_parent", "p2"),
              this.builders.raw(`${get("cte_p").key}.depth + 1`)
            )
              .from(as("posts", "p2"))
              .join(
                as("cte_p"),
                toColumn("cte_p", "ID"),
                toColumn("posts", "post_parent", "p2")
              );
          });
      })
      .select(toColumn("cte_p", "depth"), toColumn("posts", "*"))
      .join(as("cte_p"), toColumn("posts", "ID"), toColumn("cte_p", "ID"));
    return this;
  }

  select(columns: Array<types.Columns<"posts"> | types.Columns<"postmeta">>) {
    this.builder.select(columns);
    return this;
  }

  whereIn(
    column: types.Columns<"posts"> | "meta_key" | "meta_value",
    values: Array<string | number>
  ) {
    this.where(column, values);
    return this;
  }

  where(
    column: types.Columns<"posts"> | "meta_key" | "meta_value",
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
          ? "postmeta"
          : "posts") as any,
        column
      ),
      op,
      value
    );

    return this;
  }

  whereLike(
    column: types.Columns<"posts">,
    value: string,
    options?: { not: boolean }
  ) {
    const { column: toColumn } = this.alias;

    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereILike(toColumn("posts", column), `%${value}%`);
    return this;
  }

  whereNotLike(column: types.Columns<"posts">, value: string) {
    return this.whereLike(column, value, { not: true });
  }

  countPublished(postType: string = "post") {
    const { column } = this.alias;
    this.from.builder
      .count("* as count")
      .where(column("posts", "post_status"), "publish")
      .where(column("posts", "post_type"), postType)
      .first();

    return this;
  }

  withTerms(
    taxonomies: types.TaxonomyName[],
    fn?: (query: TermsQuery) => void
  ) {
    const termsQuery = this.builders.get(TermsQuery, this.builder, this.alias);
    const { column } = this.alias;
    this.builder
      .__ref(termsQuery)
      .joinTermRelationships(column("posts", "ID"))
      .joinTermTaxonomy()
      .joinTerms()
      .andWhere((query) => {
        for (const taxonomy of taxonomies) {
          query.or.where("taxonomy", taxonomy);
        }
      });

    fn && fn(termsQuery);
    return this;
  }

  // Used by term.trx.ts / _update_post_term_count
  countTerm(
    termTaxonomyId: number,
    postStatuses: types.PostStatus[],
    postTypes: types.PostType[]
  ) {
    const termsQuery = this.builders.get(TermsQuery, this.builder, this.alias);
    const { column } = this.alias;

    this.from.builder
      .count("* as count")
      .__ref(termsQuery)
      .joinTermRelationships(column("posts", "ID"))
      .builder.__ref(this)
      .whereIn("post_status", postStatuses)
      .whereIn("post_type", postTypes)
      .builder.__ref(termsQuery)
      .where("terms_relationships.term_taxonomy_id", termTaxonomyId)
      .builder.first();

    return this;
  }

  // Used by term.trx.ts / _update_post_term_count
  countAttachment(termTaxonomyId: number, postStatues: types.PostStatus[]) {
    const terms = this.builders.get(TermsQuery, this.builder, this.alias);
    const { column } = this.alias;

    this.from.builder
      .count("* as count")
      .__ref(terms)
      .joinTermRelationships(column("posts", "ID"))
      .builder.__ref(this)
      .builder.andWhere((subBuilder) => {
        this.builders
          .get(PostsQuery, subBuilder, this.alias)
          .whereIn("post_status", postStatues)
          .builder.orWhere((subBuilder2) => {
            const subBuilderWhere = this.builders.get(PostsQuery);
            const { column: innerColumn } = subBuilderWhere.alias;
            subBuilderWhere
              .select(["post_status"])
              .from.builder.whereRaw(
                `${innerColumn("posts", "ID")} = ${column(
                  "posts",
                  "post_parent"
                )}`
              );
            this.builders
              .get(PostsQuery, subBuilder2, this.alias)
              .whereIn("post_status", ["inherit"])
              .where("post_parent", 0, ">")
              .builder.whereRaw(
                `(${subBuilderWhere.builder}) in (${postStatues
                  .map(() => "?")
                  .join(",")})`,
                postStatues
              );
          });
      })
      .__ref(this)
      .where("post_type", "attachment")
      .builder.__ref(terms)
      .where("terms_relationships.term_taxonomy_id", termTaxonomyId)
      .builder.first();
    return this;
  }
}
