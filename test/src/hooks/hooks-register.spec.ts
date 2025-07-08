import { Action, Filter, HooksReflect } from "@rnaga/wp-node/core/hooks";
import { action, filter, hook } from "@rnaga/wp-node/decorators/hooks";

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

describe("test hooks", () => {
  let instance: Test;
  let filter = new Filter();
  let action = new Action();

  beforeEach(() => {
    instance = new Test();
    filter = new Filter();
    action = new Action();

    HooksReflect.register([filter, action], instance, Test);
  });

  test("filter", () => {
    let result = filter.apply("test_filter", 1);
    expect(result).toEqual(21);

    const filterListener = (data: number) => {
      return data + 10000;
    };

    filter.add("test_filter", filterListener);

    result = filter.apply("test_filter", 1);
    expect(result).toBe(10021);

    // Check duplicate
    filter.add("test_filter", filterListener);
    result = filter.apply("test_filter", 1);
    expect(result).toBe(10021);

    // Check if listener is removed
    filter.remove("test_filter", filterListener);
    result = filter.apply("test_filter", 1);

    expect(result).toBe(21);

    // Check if returned function for removing listener works
    const remove = filter.add("test_filter", filterListener);
    result = filter.apply("test_filter", 1);
    expect(result).toBe(10021);
    remove();
    result = filter.apply("test_filter", 1);
    expect(result).toBe(21);
  });

  test("action", () => {
    action.do("core_test_action");
    expect(instance.v).toEqual(123);

    expect(action.getEventName("name")).toBe("__action_hook_name");

    const actionListener = () => {
      instance.v = 10000;
    };

    action.add("core_test_action", actionListener);

    action.do("core_test_action");
    expect(instance.v).toBe(10000);

    instance.v = 0;

    // Check if listener is removed
    action.remove("core_test_action", actionListener);
    action.do("core_test_action");

    expect(instance.v).toBe(123);

    // Check duplicate
    let i = 0;
    const actionListener2 = () => {
      i += 10000;
    };

    action.add("core_test_action", actionListener2);
    action.add("core_test_action", actionListener2);
    action.do("core_test_action");

    expect(i).toBe(20000);

    action.remove("core_test_action", actionListener2);
    action.remove("core_test_action", actionListener2);

    // Triggers once
    i = 0;
    action.add("core_test_action", actionListener2, { once: true });
    action.do("core_test_action");
    action.do("core_test_action");
    expect(i).toBe(10000);

    i = 0;
    action.addOnce("core_test_action", actionListener2);
    action.do("core_test_action");
    action.do("core_test_action");
    expect(i).toBe(10000);

    // expect(instance.v).toBe(10123);

    // Async
    i = 0;
    const actionListener3 = async () => {
      i += 10000;
    };

    action.addOnce("core_test_action", actionListener3);
    action.do("core_test_action");

    const actionListener4 = () => {
      i += 20000;
    };

    const remove = action.add("core_test_action", actionListener4);
    action.do("core_test_action");

    expect(i).toBe(30000);
    i = 0;

    // Check if returned function for removing listener works
    remove();
    action.do("core_test_action");
    expect(i).toBe(0);
  });
});
