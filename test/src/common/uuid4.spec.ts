import { uuid4 } from "@rnaga/wp-node/common/";

test("uuid4", () => {
  const id = uuid4();
  console.log("uuid4", id);
  expect(id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  );
});
