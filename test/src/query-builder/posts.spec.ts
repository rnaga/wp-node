import Application from "@rnaga/wp-node/application";
import {
  PostsQuery,
  TermsQuery,
  QueryBuilders,
} from "@rnaga/wp-node/query-builder";

test("get post", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders.get(PostsQuery, builder).from.withMeta().get(1);

  console.log(builder.toString());
});

test("with terms", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const posts = builders.get(PostsQuery, builder);
  const terms = builders.get(TermsQuery, builder, posts.alias);

  const { column } = posts.alias;
  posts.from.builder
    .__ref(terms)
    .joinTermRelationships(column("posts", "ID"))
    .joinTermTaxonomy()
    .joinTerms()
    .whereIn("taxonomy", ["category"])
    .whereIn("name", ["Uncategorized"]);

  console.log(builder.toString());
});

test("with terms relationships", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const posts = builders.get(PostsQuery, builder);
  const terms = builders.get(TermsQuery, builder, posts.alias);

  const { column } = posts.alias;
  posts.from.builder
    .__ref(terms)
    .joinTermRelationships(column("posts", "ID"))
    .builder.__ref(posts)
    .where("ID", 1);

  console.log(builder.toString());
});

test("count attachment", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders.tables.index = 2;
  const posts = builders.get(PostsQuery, builder);
  const terms = builders.get(TermsQuery, builder, posts.alias);

  const { column } = posts.alias;

  posts.from.builder
    .count()
    .__ref(terms)
    .joinTermRelationships(column("posts", "ID"))
    .builder.__ref(posts)
    .builder.andWhere((subBuilder) => {
      builders
        .get(PostsQuery, subBuilder, posts.alias)
        .whereIn("post_status", ["publish"])
        .builder // })
        .orWhere((subBuilder2) => {
          const subBuilderWhere = builders.get(PostsQuery);
          const { column: innerColumn } = subBuilderWhere.alias;
          subBuilderWhere
            .select(["post_status"])
            .from.builder.whereRaw(
              `${innerColumn("posts", "ID")} = ${column(
                "posts",
                "post_parent"
              )}`
            );
          builders
            .get(PostsQuery, subBuilder2, posts.alias)
            .whereIn("post_status", ["inherit"])
            .where("post_parent", 0, ">")
            .builder.whereRaw(`(${subBuilderWhere.builder}) in (?)`, "publish");
        });
    })
    .__ref(posts)
    .where("post_type", "attachment")
    .builder.__ref(terms)
    .where("terms_relationships.term_taxonomy_id", 1);

  console.log(builder.toString());
});

test("termsCountAttachment", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const posts = builders.get(PostsQuery, builder);

  posts.countAttachment(1, ["publish", "future"]);

  console.log(builder.toString());
});

test("count object types", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const posts = builders.get(PostsQuery, builder);

  posts.countTerm(1, ["publish", "future"], ["post", "page"]);

  console.log(builder.toString());
});

test("get parents", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders.get(PostsQuery, builder).from.withParents(131);
  console.log(builder.toString());
});

test("get children", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders
    .get(PostsQuery, builder)
    .from.withChildren(122)
    .where("post_type", "revision")
    .where("post_status", "inherit");
  console.log(builder.toString());
});

test("count publised", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders.get(PostsQuery, builder).from.countPublished();
  console.log(builder.toString());
});

test("count", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders.get(PostsQuery, builder).from.count("posts", "ID");
  console.log(builder.toString());
});

test("withTerms", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders
    .get(PostsQuery, builder)
    .from.withTerms(["category", "post_tag"], (query) => {
      query.whereIn("term_id", [1]);
    });
  console.log(builder.toString());
});

test("countGroupby", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders
    .get(PostsQuery, builder)
    .from.where("post_type", "post")
    .countGroupby("posts", "post_status");
  console.log(builder.toString());
});

test("withoutMeta - key/value", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders
    .get(PostsQuery, builder)
    .from.withoutMeta("__meta_key", "__meta_value");
  console.log(builder.toString());
});

test("withoutMeta - key", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  builders.get(PostsQuery, builder).from.withoutMeta("__meta_key");
  console.log(builder.toString());
});
