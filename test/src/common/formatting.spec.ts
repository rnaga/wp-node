import { z } from "zod";
import { formatting } from "@rnaga/wp-node/common/formatting";
import { validating } from "@rnaga/wp-node/common";
import * as val from "@rnaga/wp-node/validators";

const schemaTest = z.object({
  str: z.string(),
  int: z.number(),
  obj: z.object({
    key1: z.string(),
    ip: z.string().optional(),
  }),
});

test("zod", () => {
  const keys = Object.keys(schemaTest.shape);
  console.log(keys);

  const ip = "192.168.0.1";
  let result: any = schemaTest.shape.obj.shape.ip.parse(ip);

  console.log(result);

  result = schemaTest.shape.obj.shape.ip.safeParse(ip);
  console.log(result);
});

test("validating", async () => {
  let result: any = validating.field("blogs", "blog_id", 1);

  result = validating.field("posts", "ID", 1);
  expect(result).toBe(1);

  try {
    validating.field("posts", "ID", "string");
  } catch (e: any) {
    expect(e.issues[0].message).toBe(
      "Invalid input: expected number, received string"
    );
  }

  result = validating.fieldSafe("posts", "ID", "string");
  expect(result).toEqual(undefined);

  result = validating.exec(val.database.wpBlogMeta.shape.meta_value, "value");
  expect(result).toBe("value");

  result = validating.execSafe(
    val.database.wpBlogMeta.shape.meta_value,
    "value"
  );
  expect(result).toBe("value");
});

test("unslash", async () => {
  const str = formatting.unslash("\\a\\bc");
  expect(str).toBe("abc");
});

test("slug", async () => {
  const slug = formatting.slug("a b c");
  expect(slug).toBe("a-b-c");

  const r = val.database.wpTerms.shape.slug.safeParse("a b c");
  expect(r.success && r.data == "a-b-c").toEqual(true);

  // Test with newlines
  expect(formatting.slug("a\nb\nc")).toBe("a-b-c");
  expect(formatting.slug("\na b c\n")).toBe("a-b-c");

  // Test with tabs
  expect(formatting.slug("a\tb\tc")).toBe("a-b-c");
  expect(formatting.slug("\ta b c\t")).toBe("a-b-c");

  // Test with mixed whitespace
  expect(formatting.slug(" \n\t a b c \t\n ")).toBe("a-b-c");
  expect(formatting.slug("test\n\tslug")).toBe("test-slug");
});

test("key", async () => {
  const key = formatting.key("ABCabc12345-_ ;'{}===");
  expect(key).toBe("abcabc12345-_");
});

test("username", async () => {
  let username = formatting.username("<a>username %20sample José Müller ");
  expect(username).toBe("username sample Jose Muller");

  username = formatting.username("__blog_activate_935");
  expect(username).toBe("__blog_activate_935");
});

test("primitive", async () => {
  let value = formatting.primitive("1");
  expect(value).toBe(1);

  value = formatting.primitive("true");
  expect(value).toBe(true);

  value = formatting.primitive("10");
  expect(value).toBe(10);

  value = formatting.primitive("null");
  expect(value).toBe(null);

  value = formatting.primitive("undefined");
  expect(value).toBe(undefined);

  value = formatting.primitive(10);
  expect(value).toBe(10);

  value = formatting.primitive(undefined);
  expect(value).toBe(undefined);

  value = formatting.primitive('{"key": 1}');
  expect((value as any).key).toBe(1);
});

test("mapDeep function", () => {
  // Test case 1: Recursively map values in an array
  const inputArray = [1, [2, [3, 4]], 5];
  const callback1 = (x: number) => x * 2;
  const result1 = formatting.mapDeep(inputArray, callback1);
  expect(result1).toEqual([2, [4, [6, 8]], 10]);

  // Test case 2: Recursively map values in an object
  const inputObject = { a: 1, b: { c: 2, d: { e: 3 } } };
  const callback2 = (x: number) => x * 2;
  const result2 = formatting.mapDeep(inputObject, callback2);
  expect(result2).toEqual({ a: 2, b: { c: 4, d: { e: 6 } } });

  // Test case 3: Map a single value
  const value = 42;
  const callback3 = (x: number) => x + 10;
  const result3 = formatting.mapDeep(value, callback3);
  expect(result3).toEqual(52);
});

test("unslash: should remove slashes from a deeply nested value", () => {
  const input = {
    a: "test\\'value",
    b: ["escaped\\'array", { c: "another\\'nested\\'value" }],
  };

  const expectedOutput = {
    a: "test'value",
    b: ["escaped'array", { c: "another'nested'value" }],
  };

  const result = formatting.unslash(input);
  expect(result).toEqual(expectedOutput);
});

test("unslash: should return the same value for non-string inputs", () => {
  const input = 123; // A non-string value

  const result = formatting.unslash(input);
  expect(result).toBe(input);
});

test("unslash: should return an empty string when passed an empty string", () => {
  const input = "";

  const result = formatting.unslash(input);
  expect(result).toBe("");
});

// formatting.specialcharsDecode
test("should decode special characters with ENT_NOQUOTES by default", () => {
  const input = 'Hello &amp; World &lt; "Quotes"';
  const expected = 'Hello & World < "Quotes"';
  expect(formatting.specialcharsDecode(input)).toBe(expected);
});

test("should decode special characters with ENT_QUOTES", () => {
  const input = 'Hello &amp; World &lt; "Quotes"';
  const expected = 'Hello & World < "Quotes"';
  expect(formatting.specialcharsDecode(input, "ENT_QUOTES")).toBe(expected);
});

test("should decode special characters with ENT_COMPAT", () => {
  const input = 'Hello &amp; World &lt; "Quotes"';
  const expected = 'Hello & World < "Quotes"';
  expect(formatting.specialcharsDecode(input, "ENT_COMPAT")).toBe(expected);
});

test('should decode special characters with "double"', () => {
  const input = 'Hello &quot;World&quot; and &lt; "Quotes"';
  const expected = 'Hello "World" and < "Quotes"';
  expect(formatting.specialcharsDecode(input, "double")).toBe(expected);
});

test('should decode special characters with "single"', () => {
  const input = 'Hello &apos;World&apos; and &lt; "Quotes"';
  const expected = "Hello 'World' and < \"Quotes\"";
  expect(formatting.specialcharsDecode(input, "single")).toBe(expected);
});

test("should return an empty string for an empty input", () => {
  expect(formatting.specialcharsDecode("")).toBe("");
});

test("should handle inputs without entities", () => {
  const input = "No special characters here";
  expect(formatting.specialcharsDecode(input)).toBe(input);
});

test("trim markup comments", () => {
  const result = formatting.trimMarkupComments(`<!-- wp:heading -->
 <h2 class="wp-block-heading">heading </h2>
 <!-- /wp:heading -->
 
 <!-- wp:paragraph -->
 <p>a</p>
 <!-- /wp:paragraph -->
 
 <!-- wp:paragraph -->
 <p>b</p>
 <!-- /wp:paragraph -->
 
 <!-- wp:paragraph -->
 <p>c</p>
 <!-- /wp:paragraph -->
 
 <!-- wp:separator {"className":"is-style-wide"} -->
 <hr class="wp-block-separator has-alpha-channel-opacity is-style-wide"/>
 <!-- /wp:separator -->
 
 <!-- wp:columns -->
 <div class="wp-block-columns"><!-- wp:column {"width":"66.66%"} -->
 <div class="wp-block-column" style="flex-basis:66.66%"><!-- wp:paragraph -->
 <p>asdd</p>
 <!-- /wp:paragraph -->
 
 <!-- wp:paragraph -->
 <p></p>
 <!-- /wp:paragraph --></div>
 <!-- /wp:column -->
 
 <!-- wp:column {"width":"33.33%"} -->
 <div class="wp-block-column" style="flex-basis:33.33%"></div>
 <!-- /wp:column --></div>
 <!-- /wp:columns -->`);
  expect(result).not.toContain("<!--");
  expect(result).not.toContain("-->");
});

test("date", () => {
  const dateString = formatting.date("01-01-2024 0:0:1", {
    format: "MM/DD/YYYY hh:mm:ss",
  });
  expect(dateString).toBe("01/01/2024 12:00:01");
});

test("formatting.parseName - parses first and last name correctly", () => {
  expect(formatting.parseName("John Doe")).toEqual({
    firstName: "John",
    lastName: "Doe",
  });
});

test("formatting.parseName - handles multiple spaces between names", () => {
  expect(formatting.parseName("John    Doe")).toEqual({
    firstName: "John",
    lastName: "Doe",
  });
});

test("formatting.parseName - handles names with middle name", () => {
  expect(formatting.parseName("John William Doe")).toEqual({
    firstName: "John",
    lastName: "William Doe",
  });
});

test("formatting.parseName - returns empty strings if only spaces are provided", () => {
  expect(formatting.parseName("   ")).toEqual({
    firstName: "",
    lastName: "",
  });
});

test("formatting.parseName - handles single name", () => {
  expect(formatting.parseName("John")).toEqual({
    firstName: "John",
    lastName: "",
  });
});

test("formatting.parseName - handles empty string", () => {
  expect(formatting.parseName("")).toEqual({ firstName: "", lastName: "" });
});
