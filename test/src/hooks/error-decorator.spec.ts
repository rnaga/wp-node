import Application from "@rnaga/wp-node/application";

class Test {}

test("no decorators", async () => {
  let errorThrown = false;
  try {
    Application.registerHooks([Test]);
  } catch (e) {
    errorThrown = true;
    expect(e).toBeInstanceOf(Error);
  }

  expect(errorThrown).toBeTruthy();
});
