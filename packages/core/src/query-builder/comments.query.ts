import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { MetaQuery } from "./meta.query";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

type ShortColumn<T extends string> =
  `comment_${T}` extends types.Columns<"comments"> ? T : never;

type AllShortColumns = types.Columns<"comments"> extends `${string}_${infer C}`
  ? C
  : never;

@queryBuilder()
export class CommentsQuery extends QueryBuilder<CommentsQuery> {
  readonly table = "comments";
  #parent?: CommentsQuery;
  #children?: CommentsQuery;
  constructor(
    public alias: Alias<"cte" | "c" | "c2" | "pto">,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, CommentsQuery);
  }

  get from() {
    this.builder.table(this.alias.as("comments"));
    return this;
  }

  get parent() {
    if (!this.#children) {
      throw new Error("this.#parent not defined");
    }
    return this.#parent;
  }

  get children() {
    if (!this.#children) {
      throw new Error("this.#children not defined");
    }
    return this.#children;
  }

  get(id: number) {
    const { column } = this.alias;
    this.builder.where(column("comments", "comment_ID"), id).first();
    return this;
  }

  countApproved(postId: number) {
    const { column } = this.alias;
    this.builder
      .where(column("comments", "comment_post_ID"), postId)
      .where(column("comments", "comment_approved"), "1")
      .count("* as count");

    this.withoutNote();
    return this;
  }

  // Exclude notes (since WP 6.9)
  withoutNote() {
    const { column } = this.alias;
    this.builder.whereNotIn(column("comments", "comment_type"), ["note"]);
    return this;
  }

  withMeta(type: "inner" | "right" = "right") {
    const meta = this.builders.get(MetaQuery, this.builder, this.alias);
    meta.setPrimaryTable("comment").from.joinPrimary(type);
    return this;
  }

  withPosts(ids: number[] = [], type: "inner" | "left" = "inner") {
    const { as, column } = this.alias;
    this.builder[type === "inner" ? "innerJoin" : "leftJoin"](
      as("posts"),
      column("comments", "comment_post_ID"),
      column("posts", "ID")
    );
    if (ids.length > 0)
      this.builder.whereIn(column("comments", "comment_post_ID"), ids);
    return this;
  }

  withUsers(userIds: number[] = [], type: "inner" | "left" = "inner") {
    const { as, column } = this.alias;
    this.builder[type === "inner" ? "innerJoin" : "leftJoin"](
      as("users"),
      column("comments", "user_id"),
      column("users", "ID")
    );
    if (userIds.length > 0)
      this.builder.whereIn(column("comments", "user_id"), userIds);
    return this;
  }

  withParent() {
    this.#parent = this.builders.get(CommentsQuery, this.builder);
    const { as: parentAs, column: parentColumn } = this.#parent.alias;
    const { column } = this.alias;
    this.builder.leftJoin(
      parentAs("comments"),
      parentColumn("comments", "comment_ID"),
      column("comments", "comment_parent")
    );

    return this;
  }

  withChildren(
    column: types.Columns<"comments">,
    obj: Array<string | number>,
    limit: number = 9999
  ) {
    const { column: parentColumn } = this.alias;

    this.#children = this.builders.get(CommentsQuery, this.builder);
    const { as, column: toColumn, get } = this.#children.alias;

    this.#children.builder
      .withRecursive(get("cte").table, (qb) => {
        qb.select(
          toColumn("comments", "comment_ID", "c"),
          toColumn("comments", "comment_parent", "c"),
          this.builders.raw("0 as depth")
        )
          .from(as("comments", "c"))
          .whereIn(toColumn("comments", column, "c"), obj)
          .union((qb) => {
            qb.select(
              toColumn("comments", "comment_ID", "c2"),
              toColumn("comments", "comment_parent", "c2"),
              this.builders.raw(`${get("cte").key}.depth + 1`)
            )
              .from(as("comments", "c2"))
              .join(
                as("cte"),
                toColumn("comments", "comment_parent", "c2"),
                toColumn("cte", "comment_ID")
              );
          });
      })
      .select(
        toColumn("cte", "depth"),
        toColumn("cte", "comment_parent"),
        parentColumn("comments", "comment_ID")
      )
      .join(
        as("cte"),
        parentColumn("comments", "comment_ID"),
        toColumn("cte", "comment_ID")
      );

    if (limit > 0) {
      this.#children.builder.limit(limit);
    }

    return this;
  }

  withStatus(status: "hold" | "approve" | "all") {
    const { column } = this.alias;
    const flags = status == "hold" ? [0] : status == "approve" ? [1] : [1, 0];
    this.builder.whereIn(column("comments", "comment_approved"), flags);
    return this;
  }

  withType<T extends string = "comment">(
    type: "comment" | "comments" | "pings" | T
  ) {
    const { column } = this.alias;
    let values;
    switch (type) {
      case "comment":
      case "comments":
        values = ["" as any, "comment"];
        break;
      case "pings":
        values = ["pingback", "trackback"];
        break;
      default:
        values = [type];
    }

    this.builder.whereIn(column("comments", "comment_type"), values);
    return this;
  }

  select(
    columns:
      | "*"
      | Array<
          | AllShortColumns
          | `parent_${AllShortColumns}`
          | `user_${types.Columns<"users">}`
          | "user_id"
          | "meta_key"
          | "meta_value"
          | "depth"
          | "*"
        >
  ) {
    this.builder.clear("select");
    if (columns === "*") {
      this.builder.distinct().select("*");
    } else {
      const { column } = this.alias;
      this.builder.select(
        ...columns.map((c) => {
          if (c === "*") {
            return "*";
          }

          // This works with withParent
          if (c.startsWith("parent_")) {
            const actualColumn = c.slice("parent_".length);
            if (!this.#parent) {
              // fallback
              return column("comments", "parent");
            }
            const { column: columnP } = this.#parent.alias;
            return columnP("comments", `comment_${actualColumn}`) + ` as ${c}`;
          }

          if (c.startsWith("user_") && c !== "user_id") {
            const userColumn = c.slice("user_".length);
            return column("users", userColumn);
          }

          if (c == "user_id" || c == "meta_key" || c == "meta_value") {
            return c;
          }

          // This works with withChildren
          if (c === "depth") {
            if (!this.#children) {
              // fallback
              return column("comments", "comment_ID");
            }
            const { column: columnC } = this.#children.alias;
            return columnC("cte", "depth");
          }

          if (c === "parent" && this.#children) {
            const { column: columnC } = this.#children.alias;
            return columnC("cte", "comment_parent");
          }

          return column("comments", `comment_${c}`);
        })
      );
    }
    return this;
  }

  whereLike(
    column: ShortColumn<
      "author" | "author_email" | "author_url" | "author_IP" | "content"
    >,
    search: string | number,
    options?: { not: boolean }
  ) {
    const { column: toColumn } = this.alias;

    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereILike(
      toColumn("comments", `comment_${column}`),
      `%${search}%`
    );
    return this;
  }

  whereNotLike(
    column: ShortColumn<
      "author" | "author_email" | "author_url" | "author_IP" | "content"
    >,
    search: string | number
  ) {
    return this.whereLike(column, search, { not: true });
  }

  whereIn(
    column: AllShortColumns | "user_id" | "meta_key" | "meta_value",
    values: Array<number | string>
  ) {
    this.where(column, values, "in");
    return this;
  }

  where(
    column: AllShortColumns | "user_id" | "meta_key" | "meta_value",
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
          ? "meta"
          : "comments") as any,
        column === "user_id" || column == "meta_key" || column == "meta_value"
          ? column
          : `comment_${column}`
      ),
      op,
      value
    );
    return this;
  }
}
