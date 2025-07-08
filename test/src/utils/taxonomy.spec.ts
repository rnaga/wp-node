import Application from "@rnaga/wp-node/application";
import { TaxonomyUtil } from "@rnaga/wp-node/core/utils/taxonomy.util";

test("get a post and meta", async () => {
  const context = await Application.getContext("single");
  const util = context.components.get(TaxonomyUtil);

  const tax = await util.get("category");

  expect(tax.props?.objectType).toBe("post");
});

test("get a default term", async () => {
  const context = await Application.getContext("single");
  const util = context.components.get(TaxonomyUtil);

  const id = await util.getDefaultTerm("category");
  expect(id).toBe(1);
});

test("get a list of taxonomues", async () => {
  const context = await Application.getContext("single");
  const util = context.components.get(TaxonomyUtil);

  const list = await util.getList();
  expect(
    list.filter((taxonomy) => taxonomy.name == "category").length > 0
  ).toBe(true);
});
