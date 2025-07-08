import Application from "@rnaga/wp-node/application";
import { queryBuilder } from "@rnaga/wp-node/decorators/component";
import { QueryBuilders, OptionsQuery } from "@rnaga/wp-node/query-builder";

@queryBuilder()
class TestQuery {
  constructor(private option: OptionsQuery) {}
}

test("test", async () => {
  const context = await Application.getContext("single");

  const qbs = context.components.get(QueryBuilders);
  const builder = qbs.queryBuilder;

  qbs.get(OptionsQuery, builder).get("capabilities");

  console.log(builder.toString());
});

test("test exception", async () => {
  const context = await Application.getContext("single");

  const qbs = context.components.get(QueryBuilders);
  const builder = qbs.queryBuilder;

  try {
    qbs.get(TestQuery, builder);
  } catch (e: any) {
    expect(e.toString()).toBe(
      "Error: Can't inject query builder in query builder"
    );
  }
});
