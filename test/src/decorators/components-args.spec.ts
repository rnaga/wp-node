import { Scope } from "@rnaga/wp-node/constants";
import { Components } from "@rnaga/wp-node/core/components";
import { args, component } from "@rnaga/wp-node/decorators/component";

@component({ scope: Scope.Transient })
class Clazz0 {
  constructor(public int: number, public str: string) {}
}

@component({ scope: Scope.Transient })
class Clazz1 {
  constructor(
    @args(1, "str") public class0: Clazz0,
    public str0: string,
    public str1: string
  ) {}
}

@component({ scope: Scope.Transient })
class Injecting {
  constructor(
    @args(1000, "__string__") public clazz0: Clazz0,
    @args("s0", "s1") public clazz1: Clazz1
  ) {}
}

test("arguments", () => {
  const components = new Components();
  const injecting = components.get(Injecting);

  expect(injecting.clazz0.int).toBe(1000);
  expect(injecting.clazz0.str).toBe("__string__");
  expect(injecting.clazz1.str0).toBe("s0");
  expect(injecting.clazz1.str1).toBe("s1");
  expect(injecting.clazz1.class0.int).toBe(1);
  expect(injecting.clazz1.class0.str).toBe("str");
});
