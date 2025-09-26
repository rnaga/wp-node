import { createHash } from "crypto";
import { Knex } from "knex";
import moment from "moment";

import { Config } from "./config";
import { DEFAULT_DATABASE_TABLES } from "./constants";
import { component } from "./decorators/component";

export type DbConnection = Knex | undefined;

// Multiple Knex instances keyed by connection configuration
const knexInstances = new Map<string, Knex>();

const generateConnectionKey = (config: any): string => {
  const connection = config.connection;
  const connectionString = `${connection.host}:${connection.port}:${connection.database}:${connection.user}`;
  return createHash("sha256").update(connectionString).digest("hex");
};

@component()
export default class Database {
  static perSiteTables = DEFAULT_DATABASE_TABLES.blog;
  private connectionKey: string;

  constructor(private config: Config) {
    this.connectionKey = generateConnectionKey(this.config.config.database);

    if (!knexInstances.has(this.connectionKey)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const knex = require("knex")({
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
      knexInstances.set(this.connectionKey, knex);
    }
  }

  get prefix() {
    return this.config.config.tablePrefix;
  }

  async hasTable(tableName: string) {
    return await this.connection.schema.hasTable(tableName);
  }

  get connection() {
    return knexInstances.get(this.connectionKey)!;
  }

  get transaction() {
    return knexInstances.get(this.connectionKey)!.transaction();
  }

  get schema() {
    return knexInstances.get(this.connectionKey)!.schema;
  }

  static closeAll() {
    for (const knex of knexInstances.values()) {
      knex.destroy();
    }
    knexInstances.clear();
  }
}
