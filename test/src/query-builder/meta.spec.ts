import Application from "@rnaga/wp-node/application";
import { MetaQuery, QueryBuilders } from "@rnaga/wp-node/query-builder";

test("not exists", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;
  const meta = builders.get(MetaQuery, builder).setPrimaryTable("post");

  meta.from.onNotExists("meta_key", "abs");

  console.log(builder.toString());
});

test("regex", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;
  const meta = builders.get(MetaQuery, builder).setPrimaryTable("post");

  meta.from.valueType("BINARY").regex("meta_key", new RegExp("^[_-a-z0-9]+"));
  console.log(builder.toString());

  builder.clear("select").clear("columns").clear("join").clear("where");

  meta.from.valueType("CHAR").regex("meta_key", new RegExp("^[_-a-z0-9]+"));

  console.log(builder.toString());
});

test("where and withKeys", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;
  const meta = builders.get(MetaQuery, builder).setPrimaryTable("post");

  meta.from.withKeys(["__key1__", "__key2__"]);
  console.log(builder.toString());

  meta.from.where("__key__", "__value__");
  console.log(builder.toString());
});

test("withIds", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;
  const meta = builders.get(MetaQuery, builder).setPrimaryTable("post");

  meta.from.withIds([1, 2, 100]);
  console.log(builder.toString());

  const buildersUsers = context.components.get(QueryBuilders);
  const builderUsers = buildersUsers.queryBuilder;
  const metaUsers = buildersUsers.get(MetaQuery, builderUsers).setPrimaryTable("user");
  metaUsers.from.withIds([10, 20, 30]);
  console.log(builderUsers.toString());
})
