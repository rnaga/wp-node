import { diffStringArray, diffObject } from "@rnaga/wp-node/common/diff";
import { diff } from "deep-object-diff";

test("diffStringArray", () => {
  let result = diffStringArray(["a"], "b");
  expect(result.length > 0).toBe(true);

  result = diffStringArray("a", "b");
  expect(result.length > 0).toBe(true);

  result = diffStringArray("a", ["a"]);
  expect(result.length > 0).toBe(false);
});

test("diffObject", () => {
  const obbj1 = { a: 1, b: 2, c: 3 };
  const obbj2 = { c: 3, b: 2, a: 2 };

  const result = diffObject(obbj1, obbj2);
  expect(Object.keys(result).length).toBe(1);

  const expectedDiff = diff(obbj1, obbj2);
  console.log("Expected Diff:", expectedDiff);
});
