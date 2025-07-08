import { Components } from "../core/components";
import { Roles } from "../core/roles";
import { Tables } from "../core/tables";
import { queryBuilder } from "../decorators/component";
import { Alias } from "./alias";
import { MetaQuery } from "./meta.query";
import { PostsQuery } from "./posts.query";
import { QueryBuilder } from "./query-builder";
import { QueryBuilders } from "./query-builders";

import type * as types from "../types";

@queryBuilder()
export class UsersQuery extends QueryBuilder<UsersQuery> {
  readonly table = "users";
  #metaJoined = false;
  constructor(
    private components: Components,
    private roles: Roles,
    public alias: Alias,
    protected builders: QueryBuilders,
    public builder: types.QueryBuilder
  ) {
    super(alias, builders, builder, UsersQuery);
  }

  get from() {
    this.builder.table(this.alias.as(this.table));
    return this;
  }

  get(u: number | string) {
    if (typeof u === "string") {
      this.where("user_nicename", u)
        .or.where("user_email", u)
        .or.where("display_name", u)
        .or.where("user_login", u);
    } else {
      this.whereIn("ID", [u]);
    }

    this.builder.first();
    return this;
  }

  select(columns: Array<types.Columns<"users"> | types.Columns<"usermeta">>) {
    this.builder.select(columns);
    return this;
  }

  withMeta(type: "inner" | "right" = "right") {
    if (this.#metaJoined) {
      return this;
    }
    const meta = this.builders.get(MetaQuery, this.builder, this.alias);
    meta.setPrimaryTable("user").from.joinPrimary(type);
    this.#metaJoined = true;
    return this;
  }

  withPublishedPosts() {
    const { column } = this.alias;
    this.builder.whereIn(column("users", "ID"), (subBuilder) => {
      this.builders
        .get(PostsQuery, subBuilder)
        .from.select(["post_author"])
        .where("post_status", "publish")
        .where("post_type", "post");
    });

    return this;
  }

  withBlogIds(blogIds: number[]) {
    const tables = this.components.get(Tables);
    const { column } = this.alias;
    const meta = this.builders.get(MetaQuery);
    meta.setPrimaryTable("user").from.joinPrimary("inner");

    for (const blogId of blogIds) {
      tables.index = blogId;
      meta.builder.or.where("meta_key", `${tables.prefix}capabilities`);
    }
    meta.builder.not.whereILike("meta_value", "a:0:{}");
    meta.select(["user_id"]);

    this.builder.whereIn(column("users", "ID"), meta.builder);
    return this;
  }

  // private get metaKeyCapabilities() {
  //   //return `${this.builders.tables.basePrefix}%capabilities`;
  //   return `${this.builders.tables.prefix}capabilities`;
  // }

  hasRole() {
    const { column } = this.alias;
    const meta = this.builders.get(MetaQuery);
    meta.setPrimaryTable("user").from.joinPrimary("inner");
    meta.builder
      .whereILike(
        "meta_key",
        `${this.builders.tables.basePrefix}%capabilities`,
        '"'
      )
      .not.whereILike("meta_value", "a:0:{}");
    meta.select(["user_id"]);

    //if (not) this.builder.whereNotIn(column("users", "ID"), meta.builder);
    this.builder.whereIn(column("users", "ID"), meta.builder);
    return this;
  }

  hasNoRole() {
    // this.hasRole(true);
    // return this;
    const { column } = this.alias;
    const meta = this.builders.get(MetaQuery);
    meta.setPrimaryTable("user").from.joinPrimary("right");

    meta.builder.whereILike(
      "meta_key",
      `${this.builders.tables.basePrefix}%capabilities`,
      '"'
    );
    meta.andWhere((query) => {
      query.setPrimaryTable("user");
      query.builder.not
        .where("meta_value", "a:0:{}")
        .and.not.where("meta_value", "");
    });
    meta.select(["user_id"]);

    this.builder.whereNotIn(column("users", "ID"), meta.builder);
    return this;
  }

  withRoles(
    roleNames: types.RoleNames[],
    options?: { blogIds?: number[] }
  ): this;
  withRoles(roleNames: string[], options?: { blogIds?: number[] }): this;
  withRoles(roleNames: any[], options?: { blogIds?: number[] }) {
    const { column } = this.alias;
    const blogIds = options?.blogIds ?? [this.builders.tables.index];
    const roles = roleNames.map((roleName) => this.roles.get(roleName));

    if (0 >= roles.length) return this;

    const tables = this.components.get(Tables);

    const meta = this.builders.get(MetaQuery);
    meta.setPrimaryTable("user").from.joinPrimary("inner");

    if (blogIds.length > 0) {
      meta.builder.andWhere((query) => {
        for (const blogId of blogIds) {
          tables.index = blogId;
          query.orWhere("meta_key", `${tables.prefix}capabilities`);
        }
      });
    }

    meta.builder.andWhere((query) => {
      for (const role of roles) {
        if (!role?.name) continue;
        query.orWhereILike("meta_value", `%${role.name.toLowerCase()}%`);
      }
    });

    meta.select(["user_id"]);
    this.builder.whereIn(column("users", "ID"), meta.builder);

    return this;
  }

  whereIn(
    column: types.Columns<"users"> | "meta_key" | "meta_value",
    values: Array<string | number>
  ) {
    this.where(column, values);
    return this;
  }

  where(
    column: types.Columns<"users"> | "meta_key" | "meta_value",
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
          ? "usermeta"
          : "users") as any,
        column
      ),
      op,
      value
    );
    return this;
  }

  whereLike(
    column: types.Columns<"users">,
    value: string,
    options?: { not: boolean }
  ) {
    const { column: toColumn } = this.alias;

    if (options?.not === true) {
      this.builder.not;
    }

    this.builder.whereILike(toColumn("users", column), `%${value}%`);
    return this;
  }

  whereNotLike(column: types.Columns<"users">, value: string) {
    return this.whereLike(column, value, { not: true });
  }
}
