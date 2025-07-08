import { phpSerialize, phpUnserialize } from "@rnaga/wp-node/common";

test("unserialize", () => {
  const json = { key: 1, key2: "2", key3: true };
  const serialized = phpSerialize(json);
  expect(phpUnserialize(serialized)["key"]).toBe(json.key);

  const s = "string";
  expect(phpUnserialize(s)).toBe(s);
});
