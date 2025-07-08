import { action, filter, hook } from "@rnaga/wp-node/decorators/hooks";
import { Hooks } from "@rnaga/wp-node/core/hooks/hooks";

@hook("test")
class Test {
  public v = 0;

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
    this.v += 123;
  }
}

test("hooks", async () => {
  const hookSet = Hooks.get("test");
  hookSet.set("test", Test);

  Hooks.set("test", hookSet);
  const hooks = new Hooks(Hooks.get("test"));
  hooks.init();

  const result = hooks.filter.apply("test_filter", 1);

  console.log(result);
});
