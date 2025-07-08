import Application from "@rnaga/wp-node/application";
import { TermsQuery, QueryBuilders } from "@rnaga/wp-node/query-builder";

test("get term id with children", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const terms = builders.get(TermsQuery, builder);
  const alias = terms.alias;
  terms.from.where("term_id", 1).withChildren("term_id", [1, 2]);

  builder.orWhere((subBuilder) => {
    builders.get(TermsQuery, subBuilder, alias).where("term_id", 2);
  });

  console.log(builder.toString());
});

test("with object id", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const terms = builders.get(TermsQuery, builder);
  const alias = terms.alias;

  terms.from
    .select(["parent", "depth", "taxonomy", "name"])
    .groupBy("term_id")
    .withChildren("term_id", [1, 2])
    .builder.orWhere((subBuilder) => {
      builders.get(TermsQuery, subBuilder, alias).withObjectIds([1, 2, 3]);
    });

  console.log(builder.toString());
});

test("max group", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const terms = builders.get(TermsQuery, builder);

  terms.maxGroup();
  console.log(builder.toString());
});

test("exists", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const terms = builders.get(TermsQuery, builder);

  terms.from.exists("name", "uncategorized", "category");
  console.log(builder.toString());

  const builder2 = builders.queryBuilder;
  const terms2 = builders.get(TermsQuery, builder2);
  terms2.from.exists("slug", "uncategorized");

  console.log(builder2.toString());
});

test("select term taxonomy", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const terms = builders.get(TermsQuery, builder);

  terms.selectTermTaxonomy;
  console.log(builder.toString());
});

test("with metas", async () => {
  const context = await Application.getContext("single");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const terms = builders.get(TermsQuery, builder);

  terms.withMeta("inner");
  console.log(builder.toString());
});
