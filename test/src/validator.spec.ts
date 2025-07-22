import Application from "@rnaga/wp-node/application";
import { Validator } from "@rnaga/wp-node/core/validator";
import * as val from "@rnaga/wp-node/validators";

test("formatter", async () => {
  const context = await Application.getContext("single");
  const validator = context.components.get(Validator);

  const result1 = validator.field("posts", "ID", 1);
  expect(result1).toBe(1);

  try {
    validator.field("posts", "ID", "string");
  } catch (e: any) {
    expect(e.issues[0].message).toBe(
      "Invalid input: expected number, received string"
    );
  }

  const result2 = validator.fieldSafe("posts", "ID", "string");
  expect(result2).toEqual(undefined);

  const result3 = validator.exec(
    val.database.wpBlogMeta.shape.meta_value,
    "value"
  );
  expect(result3).toBe("value");

  const result4 = validator.execSafe(
    val.database.wpBlogMeta.shape.meta_value,
    "value"
  );
  expect(result4).toBe("value");
});

test("date", async () => {
  const context = await Application.getContext("single");
  const validator = context.components.get(Validator);

  const result = validator.execSafe(
    val.database.wpPosts.shape.post_date_gmt,
    undefined
  );

  expect(typeof result).toBe("string");

  const result2 = validator.execSafe(
    val.database.wpPosts.shape.post_date_gmt,
    "0000-00-00 00:00:00"
  );

  expect(result2).toBe("0000-00-00 00:00:00");

  const now = validator.execSafe(
    val.database.wpPosts.shape.post_date_gmt,
    undefined
  ) as string;

  const diff = Date.parse(now) - Date.parse("2010-01-01");
  expect(diff > 0).toBe(true);

  const result3 = validator.execSafe(
    val.database.wpPosts.shape.post_date_gmt,
    new Date("0000-00-00 00:00:00") as any
  );

  expect(result3).toBe(undefined);
});
