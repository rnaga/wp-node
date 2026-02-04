import Application from "@rnaga/wp-node/application";
import {
  CommentsQuery,
  QueryBuilders,
} from "@rnaga/wp-node/query-builder";

test("with posts", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const comments = builders.get(CommentsQuery, builder);

  comments.from.withPosts([1, 2, 3], "left").select(["ID", "post_ID"]);
  comments.from.withPostSlugs(["hello-world", "second-post"]);

  console.log(builder.toString());

  const builders2 = context.components.get(QueryBuilders);
  const builder2 = builders2.queryBuilder;

  const comments2 = builders2.get(CommentsQuery, builder2);

  comments2.from.withPosts([4, 5, 6], "left").select(["ID", "post_ID"]);
  comments2.from.withPostSlugs(["hello-world"]);

  console.log(builder2.toString());
});

test("children", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const comments = builders.get(CommentsQuery, builder);

  comments.from
    .withChildren("comment_ID", [28], 10)
    .select(["ID", "parent", "depth"]);

  console.log(builder.toString());
});

test("with meta", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const comments = builders.get(CommentsQuery, builder);

  comments.from.withMeta();

  console.log(builder.toString());
});

test("where", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const comments = builders.get(CommentsQuery, builder);
  const { column } = comments.alias;

  const result = comments.from
    .whereIn("ID", [1, 2, 3, 4, 5, 6, 7])
    .builder.or.__ref(comments)
    .where("parent", 1)
    .builder.or.__ref(comments)
    .whereLike("author", 1)
    .builder.or.__ref(comments)
    .where("ID", 0, ">")
    .select(["ID", "agent", "approved", "author_email", "user_id"])
    .builder.limit(10)
    .orderBy(column("comments", "comment_ID"), "desc");

  console.log(result.toString());
});

test("count approved", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const comments = builders.get(CommentsQuery, builder);

  comments.from.countApproved(1);

  console.log(builder.toString());
});

test("with parent", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const comments = builders.get(CommentsQuery, builder);

  comments.from.withParent();
  comments.select(["ID", "author_email", "parent_ID", "parent_author_email"]);

  console.log(builder.toString());
});

test("with users", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const comments = builders.get(CommentsQuery, builder);

  comments.from.withUsers().where("user_id", 0, ">");
  comments.select(["*", "user_display_name"]);

  console.log(builder.toString());
});
