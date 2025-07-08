import { Scope } from "@rnaga/wp-node/constants";
import { Components } from "@rnaga/wp-node/core/components";
import { component } from "@rnaga/wp-node/decorators/component";

@component({ scope: Scope.Singleton })
class Clazz0 {
  constructor(public num: number = 1) {
    console.log("Class0");
  }
}

@component({ scope: Scope.Singleton })
class Clazz1 {
  constructor(public clazz0: Clazz0, public num: number = 1) {
    console.log("Class1");
  }
}

@component({ scope: Scope.Transient })
class Clazz1_5 {
  constructor(public num: number = 1) {
    console.log("Class1_5");
  }
}

@component({ scope: Scope.Transient })
class Clazz2 {
  constructor(public class1: Clazz1, public class1_5: Clazz1_5) {
    console.log("Class2");
  }
}

test("invalid scope", () => {
  let err = undefined;
  try {
    @component({ scope: Scope.Singleton })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class Clazz2_1 {
      constructor(public class1_5: Clazz1_5) {}
    }
  } catch (e) {
    err = e;
  }

  expect(String(err)).toBe(
    "Error: Clazz2_1 has dependencies with invalid scope: Clazz1_5"
  );
});

test("scopes", () => {
  const components_0 = new Components();
  const clazz2_0 = components_0.get(Clazz2);
  clazz2_0.class1.clazz0.num = 1000;
  clazz2_0.class1.num = 1000;

  const components_1 = new Components();
  const clazz2_1 = components_1.get(Clazz2);

  expect(clazz2_0.class1_5).not.toBe(clazz2_1.class1_5);
  expect(clazz2_0.class1).toBe(clazz2_1.class1);
  expect(clazz2_0.class1.clazz0.num).toBe(clazz2_1.class1.clazz0.num);
});
