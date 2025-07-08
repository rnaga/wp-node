import Application from "@rnaga/wp-node/application";
import { MetaUtil } from "@rnaga/wp-node/core/utils/meta.util";

test("get a subtype", async () => {
  const context = await Application.getContext("single");

  const metaUtil = context.components.get(MetaUtil);
  let subType = await metaUtil.getObjectSubtype("post", 1);
  expect(subType).toBe("post");

  subType = await metaUtil.getObjectSubtype("comment", 1);
  expect(subType).toBe("comment");

  subType = await metaUtil.getObjectSubtype("term", 1);
  expect(subType).toBe("category");

  subType = await metaUtil.getObjectSubtype("user", 1);
  expect(subType).toBe("user");

  subType = await metaUtil.getObjectSubtype("post", -10);
  expect(subType).toEqual(undefined);
});

test("test is protected meta", async () => {
  const testCases = [
    "_valid_key",
    "key_with_underscores",
    "!@#$invalid_key!@#$", // Contains special characters
    "   spaces_in_key   ", // Contains leading/trailing spaces
    "", // Empty key
  ];

  const context = await Application.getContext("single");
  const metaUtil = context.components.get(MetaUtil);

  for (const testCase of testCases) {
    const result = metaUtil.isProtected(testCase);
    const isValid = testCase === "_valid_key";
    expect(isValid).toEqual(result);
  }
});
