import Application from "@rnaga/wp-node/application";
import { Taxonomy } from "@rnaga/wp-node/core/taxonomy";

test("category", async () => {
  const context = await Application.getContext("single");

  const category = await context.components.asyncGet(Taxonomy, ["category"]);

  console.log(category.props?.capabilities);
});
