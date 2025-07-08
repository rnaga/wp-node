import { action, filter, hook } from "@rnaga/wp-node/decorators/hooks";
import { defineHooks } from "@rnaga/wp-node/common";

@hook("test")
class Test {
  public static v = 0;

  @filter("test_filter")
  testFilter1(data: number) {
    return data + 10;
  }

  @filter("test_filter")
  testFilter2(data: any) {
    return data + 10;
  }

  @action("core_test_action")
  testAction() {
    Test.v += 123;
  }
}

test("getHooks", async () => {
  const hooks = defineHooks("test", [Test]);

  // filter
  const result = hooks.filter.apply("test_filter", 1);

  expect(result).toBe(21);

  // action
  hooks.action.do("core_test_action");
  expect(Test.v).toBe(123);
});
