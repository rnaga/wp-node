import { component } from "../../decorators/component";
import { Query } from "../query";
import type * as types from "../../types";
import * as val from "../../validators";
import {
  PostsQuery,
  QueryBuilders,
  TermsQuery,
  CommentsQuery,
  UsersQuery,
  MetaQuery,
  BlogsQuery,
  SiteQuery,
  OptionsQuery,
  CommonQuery,
} from "../../query-builder";
import { Scope } from "../../constants";
import { Components } from "../components";
import { Config } from "../../config";
import { Current } from "../current";

@component({ scope: Scope.Transient })
export class QueryUtil {
  constructor(private components: Components, private config: Config) {}

  #blogId = -99;
  usingBlog(id: number) {
    if (this.config.isMultiSite()) this.#blogId = id;
    return this;
  }

  resetBlog() {
    this.usingBlog(-99);
    return this;
  }

  private async base<
    Q,
    Default extends types.validating.Parser,
    T extends types.validating.Parser = Default
  >(
    fn: (query: any, builders: QueryBuilders) => void,
    formatter: T,
    clazz: types.Constructor<Q>
  ) {
    return await this.components
      .get(Query)
      .build((query, builders) => {
        const qb = builders?.get(clazz, query) as any;
        if (this.config.isMultiSite()) {
          builders.tables.index =
            this.#blogId > 0
              ? this.#blogId
              : this.components.get(Current).tables.index;
        }
        qb.from;
        fn(qb, builders);
      })
      .execute(formatter);
  }

  async custom<C, T extends types.validating.Parser>(
    clazz: types.Constructor<C>,
    formatter: T,
    func: (query: C, builders: QueryBuilders) => void
  ) {
    return (await this.base(func, formatter, clazz as any)) as
      | types.validating.ParserReturnType<T>
      | undefined;
  }

  async terms<T extends types.validating.Parser = typeof val.query.termsResult>(
    func: (query: TermsQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    return (await this.base(
      func,
      formatter ?? val.query.termsResult,
      TermsQuery
    )) as types.validating.ParserReturnType<T> | undefined;
  }

  async posts<T extends types.validating.Parser = typeof val.query.postsResult>(
    func: (query: PostsQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    return (await this.base(
      func,
      formatter ?? val.query.postsResult,
      PostsQuery
    )) as types.validating.ParserReturnType<T> | undefined;
  }

  async comments<
    T extends types.validating.Parser = typeof val.query.commentsResult
  >(
    func: (query: CommentsQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    return (await this.base(
      func,
      formatter ?? val.query.commentsResult,
      CommentsQuery
    )) as types.validating.ParserReturnType<T> | undefined;
  }

  async users<T extends types.validating.Parser = typeof val.query.usersResult>(
    func: (query: UsersQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    return (await this.base(
      func,
      formatter ?? val.query.usersResult,
      UsersQuery
    )) as types.validating.ParserReturnType<T> | undefined;
  }

  async blogs<T extends types.validating.Parser = typeof val.query.blogsResult>(
    func: (query: BlogsQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    return (await this.base(
      func,
      formatter ?? val.query.blogsResult,
      BlogsQuery
    )) as types.validating.ParserReturnType<T> | undefined;
  }

  async sites<T extends types.validating.Parser = typeof val.query.sitesResult>(
    func: (query: SiteQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    return (await this.base(
      func,
      formatter ?? val.query.sitesResult,
      SiteQuery
    )) as types.validating.ParserReturnType<T> | undefined;
  }

  async options<
    T extends types.validating.Parser = typeof val.query.optionsResult
  >(
    func: (query: OptionsQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    return (await this.base(
      func,
      formatter ?? val.query.optionsResult,
      OptionsQuery
    )) as types.validating.ParserReturnType<T> | undefined;
  }

  async meta<
    Table extends types.MetaTable,
    T extends types.validating.Parser = {
      post: typeof val.query.metaPostResult;
      comment: typeof val.query.metaCommentResult;
      blog: typeof val.query.metaBlogResult;
      term: typeof val.query.metaTermResult;
      user: typeof val.query.metaUserResult;
      site: typeof val.query.metaSiteResult;
    }[Table]
  >(
    type: Table,
    fn: (query: MetaQuery, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    if (!formatter) {
      switch (type) {
        case "post":
          formatter = val.query.metaPostResult as any;
          break;
        case "comment":
          formatter = val.query.metaCommentResult as any;
          break;
        case "blog":
          formatter = val.query.metaBlogResult as any;
          break;
        case "term":
          formatter = val.query.metaTermResult as any;
          break;
        case "user":
          formatter = val.query.metaUserResult as any;
          break;
        case "site":
          formatter = val.query.metaSiteResult as any;
          break;
        default:
          formatter = val.query.metaResult as any;
          break;
      }
    }

    const wrappedFunc: (query: MetaQuery, builders: QueryBuilders) => void = (
      query,
      builders
    ) => {
      query.setPrimaryTable(type).from;
      fn(query, builders);
    };
    return (await this.base(wrappedFunc, formatter as any, MetaQuery)) as
      | types.validating.ParserReturnType<T>
      | undefined;
  }

  async common<
    Table extends "signups" | "links" | "registration_log",
    T extends types.validating.Parser = {
      signups: typeof val.query.signupsResult;
      links: typeof val.query.linksResult;
      registration_log: typeof val.query.registrationLogResult;
    }[Table],
    Query = CommonQuery<Table>
  >(
    table: Table,
    fn: (query: Query, builders: QueryBuilders) => void,
    formatter?: T
  ) {
    if (!formatter) {
      switch (table) {
        case "signups":
          formatter = val.query.signupsResult as any;
          break;
        case "links":
          formatter = val.query.linksResult as any;
          break;
        default:
          formatter = val.query.registrationLogResult as any;
          break;
      }
    }

    const wrappedFunc: (query: Query, builders: QueryBuilders) => void = (
      query,
      builders
    ) => {
      (query as any).withTable(table).from;
      fn(query, builders);
    };

    return (await this.base(
      wrappedFunc,
      formatter as any,
      CommonQuery<Table>
    )) as types.validating.ParserReturnType<T> | undefined;
  }
}
