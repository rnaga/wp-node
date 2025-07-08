import Application from "@rnaga/wp-node/application";
import {
  QueryBuilders,
  PostsQuery,
  TermsQuery,
} from "@rnaga/wp-node/query-builder";

test("query builder", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;
  const postQuery = builders.get(PostsQuery, builder);

  postQuery.builder
    .count("* as count")
    .__ref(postQuery)
    .usingQuery(TermsQuery, postQuery.alias);
  console.log(builder.toString());
});
