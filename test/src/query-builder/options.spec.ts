import Application from "@rnaga/wp-node/application";
import { OptionsQuery, QueryBuilders } from "@rnaga/wp-node/query-builder";

test("single site", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const options = builders.get(OptionsQuery, builder);

  options.from.get("siteurl");

  console.log(builder.toString());
});

test("Where In", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const options = builders.get(OptionsQuery, builder);

  options.from.whereIn(["siteurl", "blogname"]);

  console.log(builder.toString());
});

test("multisite", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders.tables.index = 2;
  const options = builders.get(OptionsQuery, builder);

  options.from.get("siteurl");

  console.log(builder.toString());
});

test("where like", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const options = builders.get(OptionsQuery, builder);

  options.from.whereLike("option_name", "site");
  console.log(builder.toString());

  options.from.whereLike("option_name", "site", { not: true });
  console.log(builder.toString());
});
