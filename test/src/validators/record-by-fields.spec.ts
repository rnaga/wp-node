import { PickZodObjectKey } from "@rnaga/wp-node/types/validating";
import * as helpers from "@rnaga/wp-node/validators/helpers";
import { z } from "zod";

test("record filter by fields", async () => {
  const schema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
  });

  const record = {
    id: 1,
    name: "John Doe",
    email: "example@example.com",
    age: 30,
  };

  const resultUnfiltered = schema.parse(record);
  expect(resultUnfiltered).toEqual(record);

  const filtered = helpers.recordByField(schema, ["id", "name"]);

  const result = filtered.parse(record) as {
    id: number;
    name: string;
  };

  expect(result).toEqual({
    id: 1,
    name: "John Doe",
  });
  expect(result).not.toHaveProperty("email");
  expect(result).not.toHaveProperty("age");
});

test("array record filter by fields", async () => {
  const schemaObject = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
  });
  const schema = z.array(schemaObject);

  const records = [
    {
      id: 1,
      name: "John Doe",
      email: "example@example.com",
      age: 30,
    },
    {
      id: 2,
      name: "Jane Doe",
      email: "jane.doe@example.com",
      age: 25,
    },
  ];

  const filtered = helpers.arrayRecordByField(schema, ["id", "name"]);

  const result = filtered.parse(records) as PickZodObjectKey<
    typeof schemaObject,
    "id" | "name"
  >[];

  expect(result).toEqual([
    {
      id: 1,
      name: "John Doe",
    },
    {
      id: 2,
      name: "Jane Doe",
    },
  ]);

  expect(result).not.toHaveProperty("email");
  expect(result).not.toHaveProperty("age");
});
