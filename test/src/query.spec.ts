import Application from "@rnaga/wp-node/application";
import { Query } from "@rnaga/wp-node/core/query";
import { PostsQuery } from "@rnaga/wp-node/query-builder";
import * as val from "@rnaga/wp-node/validators";

test("query wrapper", async () => {
  const context = await Application.getContext("single");

  const query = context.components.get(Query);

  const result = await query
    .build((query, builders) => {
      builders.get(PostsQuery, query).from.get(1);
    })
    .execute(val.database.wpPosts);

  expect(result.ID).toEqual(1);
});
