import {
  defineWPConfig,
  defineTaxonomies,
} from "@rnaga/wp-node/common/config";
import { Context } from "@rnaga/wp-node/core/context";
import { User } from "@rnaga/wp-node/core/user";

export const DB_USER = "wptest";
export const DB_PASSWORD = "wptest";
export const DB_NAME_SINGLE = "wptest";
export const DB_NAME_MULTI = "wptest-multi";

export const DB_USER_ROOT = "root";
export const DB_PASSWORD_ROOT = "root";

// Define dummy taxonomies for testing
const taxonomies = defineTaxonomies({
  custom: {
    objectType: "post",
    hierarchical: false,
    showUi: false,
    capabilities: {
      manage_terms: "manage_terms",
      assign_terms: "assign_terms",
      edit_terms: "edit_tems",
      delete_terms: "delete_terms",
    },
  },
});

export const getDbConfig = (
  user: string,
  password: string,
  database?: string
) => {
  const config = {
    client: "mysql2",
    connection: {
      host: "db",
      port: 3306,
      user,
      password,
      charset: "utf8mb4",
    },
  } as any;

  if (database) {
    config.connection["database"] = database;
  }

  return config;
};

export const siteUrl = "http://localhost";

export const getCliConfig = (env: "single" | "multi", dbName?: string) => {
  const dbConfig = getDbConfig(
    DB_USER_ROOT,
    DB_PASSWORD_ROOT,
    env === "single" ? DB_NAME_SINGLE : DB_NAME_MULTI
  );

  return {
    staticAssetsPath: "/tmp/assets",
    multisite: {
      enabled: env === "multi",
      defaultBlogId: 1,
      defaultSiteId: 1,
    },
    database: {
      ...dbConfig,
      connection: {
        ...dbConfig.connection,
        database: dbName ?? dbConfig.connection.database,
      },
    },
  };
};

export const getAppConfig = (args: {
  appName: string;
  isMulti: boolean;
  database: {
    user: string;
    password: string;
    database?: string;
  };
}) => {
  const { appName, isMulti, database } = args;
  const dbConfig = getDbConfig(
    database.user,
    database.password,
    database.database
  );

  let config: any;

  if (!isMulti) {
    config = defineWPConfig({
      staticAssetsPath: "/tmp/assets",
      constants: {
        LINK_USE_SSL: false,
      },
      database: dbConfig,
      taxonomies,
    });
  } else {
    config = defineWPConfig({
      staticAssetsPath: "/tmp/assets",
      multisite: {
        enabled: true,
        defaultBlogId: 1,
        defaultSiteId: 1,
      },
      database: dbConfig,
      taxonomies,
    });
  }

  return {
    [appName]: config,
  };
};

export const getBaseAppConfig = () => {
  const singleApp = getAppConfig({
    appName: "single",
    isMulti: false,
    database: {
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME_SINGLE,
    },
  });

  const multiApp = getAppConfig({
    appName: "multi",
    isMulti: true,
    database: {
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME_MULTI,
    },
  });

  return {
    ...singleApp,
    ...multiApp,
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const getKnexInstance = (config: any) => require("knex")(config);

export const destoryKnexInstance = async (knexInstance: any) =>
  await knexInstance.destroy();

// Function to create a new database only if it doesn't exist
export async function createDatabase(databaseName: string): Promise<void> {
  await dropDatabase(databaseName);

  const dbConfigRoot = getDbConfig(DB_USER_ROOT, DB_PASSWORD_ROOT);
  const knex = getKnexInstance(dbConfigRoot);

  await knex.raw(`CREATE DATABASE IF NOT EXISTS ??`, databaseName);
  console.log(`Database ${databaseName} created or already exists.`);

  await destoryKnexInstance(knex);
}

// Function to drop a database only if it exists
export async function dropDatabase(databaseName: string): Promise<void> {
  const dbConfigRoot = getDbConfig(DB_USER_ROOT, DB_PASSWORD_ROOT);
  const knex = getKnexInstance(dbConfigRoot);

  await knex.raw(`DROP DATABASE IF EXISTS ??`, databaseName);
  console.log(`Database ${databaseName} dropped if it existed.`);

  await destoryKnexInstance(knex);
}

export async function tableExists(databaseName: string, tableName: string) {
  const dbConfigRoot = getDbConfig(
    DB_USER_ROOT,
    DB_PASSWORD_ROOT,
    databaseName
  );
  const knex = getKnexInstance(dbConfigRoot);
  const result = await knex.schema.hasTable(tableName);

  await destoryKnexInstance(knex);

  return result;
}

export async function columnExists(
  databaseName: string,
  tableName: string,
  columnName: string
) {
  const dbConfigRoot = getDbConfig(
    DB_USER_ROOT,
    DB_PASSWORD_ROOT,
    databaseName
  );
  const knex = getKnexInstance(dbConfigRoot);
  const result = await knex.schema.hasColumn(tableName, columnName);

  await destoryKnexInstance(knex);

  return result;
}

// Function to remove a specific column from a table
export async function dropColumn(
  databaseName: string,
  tableName: string,
  columnName: string
): Promise<void> {
  const dbConfigRoot = getDbConfig(
    DB_USER_ROOT,
    DB_PASSWORD_ROOT,
    databaseName
  );
  const knex = getKnexInstance(dbConfigRoot);

  if (await columnExists(databaseName, tableName, columnName)) {
    await knex.schema.alterTable(tableName, (table: any) => {
      table.dropColumn(columnName);
    });
    console.log(`Column ${columnName} dropped from table ${tableName}.`);
  } else {
    console.log(`Column ${columnName} does not exist in table ${tableName}.`);
  }

  await destoryKnexInstance(knex);
}

export async function getTestUsers(context: Context) {
  const PREFIX = "wptest";
  const SUFFIX = 0;

  const SUPERADMIN = `wp-multi`;
  const ADMIN = `${PREFIX}administrator${SUFFIX}`;
  const EDITOR = `${PREFIX}editor${SUFFIX}`;
  const CONTRIBUTOR = `${PREFIX}contributor${SUFFIX}`;
  const SUBSCRIBER = `${PREFIX}subscriber${SUFFIX}`;

  return {
    superAdmin: await context.components.asyncGet(User, [`${SUPERADMIN}`]),
    admin: await context.components.asyncGet(User, [`${ADMIN}`]),
    editor: await context.components.asyncGet(User, [`${EDITOR}`]),
    contributor: await context.components.asyncGet(User, [`${CONTRIBUTOR}`]),
    subscriber: await context.components.asyncGet(User, [`${SUBSCRIBER}`]),
    anonymous: await context.components.asyncGet(User, [0]),
  };
}
