import { DEFAULT_DATABASE_TABLES } from "./default-database-tables";
export const TABLE_NAMES = [
  ...DEFAULT_DATABASE_TABLES.blog,
  ...DEFAULT_DATABASE_TABLES.global,
  ...DEFAULT_DATABASE_TABLES.ms_global,
] as const;
