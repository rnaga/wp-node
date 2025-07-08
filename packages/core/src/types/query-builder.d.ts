import { Knex } from "knex";

export type QueryBuilder = Knex.QueryBuilder;

declare module "knex" {
  namespace Knex {
    interface QueryInterface {
      __ref<T>(ref: T): T;
    }
  }
}
