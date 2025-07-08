import { createFluentProxy } from "@rnaga/wp-node/schema-builder/proxy";

test("proxy", async () => {
  const [obj, calls] = createFluentProxy();
  obj
    .bigIncrements("meta_id")
    .unsigned()
    .notNullable()
    .primary()
    .anything()
    .else();

  const result = calls.filter((v) => v.method == "bigIncrements");
  expect(result.length > 0).toBe(true);
});
