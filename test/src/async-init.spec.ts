import Application from "@rnaga/wp-node/application";
import { AsyncInitReflect } from "@rnaga/wp-node/core/async-init-reflect";
import { asyncInit } from "@rnaga/wp-node/decorators/async-init";
import { component } from "@rnaga/wp-node/decorators/component";

@component()
class AsyncClass {
  num = 1;

  @asyncInit
  init() {
    return new Promise((ok) => {
      setTimeout(() => {
        this.num = 9999;
        ok(true);
      }, 100);
    });
  }
}

test("async init", async () => {
  const instance = new AsyncClass();

  await AsyncInitReflect.get(instance, AsyncClass);

  expect(instance.num).toBe(9999);
});

test("e2e", async () => {
  const context = await Application.getContext("single");

  const instance = await context.components.asyncGet(AsyncClass);

  expect(instance.num).toBe(9999);
});
