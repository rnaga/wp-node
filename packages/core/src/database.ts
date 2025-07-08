import { Knex } from "knex";
import { Scope } from "./constants";
import { Config } from "./config";
import { component } from "./decorators/component";
import { DEFAULT_DATABASE_TABLES } from "./constants";
import moment from "moment";

export type DbConnection = Knex | undefined;

@component({ scope: Scope.Singleton })
export default class Database {
  static connections: Knex[] = [];
  static perSiteTables = DEFAULT_DATABASE_TABLES.blog;

  #knex: Knex;
  constructor(private config: Config) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.#knex = require("knex")({
      ...this.config.config.database,
      connection: {
        ...this.config.config.database.connection,
        timezone: "+00:00", // UTC
        typeCast: (field: any, next: (...args: any) => any) => {
          if (field.type == "DATETIME") {
            return moment(field.string()).format("YYYY-MM-DD HH:mm:ss");
          }
          return next();
        },
      },
    });

    Database.connections.push(this.#knex);
  }

  get prefix() {
    return this.config.config.tablePrefix;
  }

  async hasTable(tableName: string) {
    return await this.connection.schema.hasTable(tableName);
  }

  get connection() {
    return this.#knex;
  }

  get transaction() {
    return this.#knex.transaction();
  }

  get schema() {
    return this.#knex.schema;
  }

  closeConnection() {
    for (let i = 0; i < Database.connections.length; i++) {
      if (Database.connections[i] === this.#knex) {
        Database.connections.splice(i, 1);
        break;
      }
    }
    this.#knex.destroy();
  }

  static closeAll() {
    for (const conn of Database.connections) {
      conn.destroy();
    }

    Database.connections = [];
  }
}
