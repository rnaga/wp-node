import Application from "@rnaga/wp-node/application";
import { BlogsQuery, QueryBuilders } from "@rnaga/wp-node/query-builder";

test("with meta", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const blogs = builders.get(BlogsQuery, builder);

  blogs.from.withMeta();

  console.log(builder.toString());
});
