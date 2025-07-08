import Application from "@rnaga/wp-node/application";
import { SiteQuery, QueryBuilders } from "@rnaga/wp-node/query-builder";

test("with meta", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const site = builders.get(SiteQuery, builder);

  site.from.withMeta().whereIn("id", [1]);

  console.log(builder.toString());
});
