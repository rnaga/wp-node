import Application from "@rnaga/wp-node/application";
import { Vars } from "@rnaga/wp-node/core/vars";

test("set and get", async () => {
  const context = await Application.getContext("single");

  const value = 10;
  const var1 = context.components.get(Vars);
  var1.map.set("vartest", value);

  const var2 = context.components.get(Vars);

  expect(var2.map.get("vartest")).toBe(value);
});
