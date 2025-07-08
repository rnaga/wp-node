export type MetaTable = "post" | "comment" | "blog" | "term" | "user" | "site";
export type MetaColumns =
  | "meta_id"
  | `${MetaTable}_id`
  | "meta_key"
  | "meta_value";
//export type MetaColumns = Extract<Columns, "meta_key" | "meta_value">;
export type MetaKey = Extract<MetaColumns, "meta_key">;
export type MetaValue = Extract<MetaColumns, "meta_value">;
