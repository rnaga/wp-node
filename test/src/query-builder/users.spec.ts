import Application from "@rnaga/wp-node/application";
import { UsersQuery, QueryBuilders } from "@rnaga/wp-node/query-builder";

test("with meta", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const users = builders.get(UsersQuery, builder);

  users.from.withPublishedPosts();

  console.log(builder.toString());
});

test("with role", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const users = builders.get(UsersQuery, builder);

  users.withRoles(["administrator", "subscriber"]);

  console.log(builder.toString());
});

test("has role", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const users = builders.get(UsersQuery, builder);

  users.from.hasRole();

  console.log(builder.toString());
});

test("with blogId", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const users = builders.get(UsersQuery, builder);

  users.from.withBlogIds([1, 2, 3]);

  console.log(builder.toString());
});

test("has not role", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const users = builders.get(UsersQuery, builder);

  users.from.hasNoRole();

  console.log(builder.toString());
});
