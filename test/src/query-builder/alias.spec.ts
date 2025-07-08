import Application from "@rnaga/wp-node/application";
import { Alias } from "@rnaga/wp-node/query-builder/alias";

test("outputs of Alias", async () => {
  const context = await Application.getContext("single");
  const alias: Alias<"table1" | "table2" | "b1" | "b2" | "cte"> =
    context.components.get(Alias);

  console.log(alias.column("table1", "col1"));
  expect(alias.column("table1", "col1")).toMatch(/^table1_[0-9]\.col1/);

  console.log(alias.as("table1"));
  expect(alias.as("table1")).toMatch(/table1 as table1_[0-9]/);

  console.log(alias.as("table2"));
  expect(alias.as("table2")).toMatch(/table2 as table2_[0-9]/);

  console.log(alias.as("blogmeta", "b1"));
  expect(alias.as("blogmeta", "b1")).toMatch(
    /wp_blogmeta as blogmeta_[0-9]_b1/
  );

  console.log(alias.column("blogmeta", "blog_id"));
  expect(alias.column("blogmeta", "blog_id")).toMatch(
    /blogmeta_[0-9]\.blog_id/
  );

  console.log(alias.column("blogmeta", "blog_id", "b1"));
  expect(alias.column("blogmeta", "blog_id", "b1")).toMatch(
    /blogmeta_[0-9]_b1\.blog_id/
  );

  console.log(alias.column("cte", "col1"));
  expect(alias.column("cte", "col1")).toMatch(/cte_[0-9]\.col1/);

  const alias2: Alias<"table1" | "table2" | "b1" | "b2" | "cte"> =
    context.components.get(Alias);

  console.log(alias2.column("table1", "col1"));
  expect(alias2.column("table1", "col1")).toMatch(/table1_[0-9]\.col1/);

  const alias3 = context.components.get(Alias);
  alias2.cloneIndex(alias3);

  console.log(alias3.get("t").key);
  expect(alias3.get("b1").key).toBe(alias2.get("b1").key);
});
