import { z } from "zod";

// https://github.com/colinhacks/zod/discussions/2790
export function unionOfLiterals<T extends string | number>(
  constants: readonly T[]
) {
  const literals = constants.map((x) => z.literal(x)) as unknown as readonly [
    z.ZodLiteral<T>,
    z.ZodLiteral<T>,
    ...z.ZodLiteral<T>[]
  ];
  return literals;
}

export const undefinedIfEmptyString = (v?: string | null | undefined) =>
  !v || 0 >= v.length ? undefined : v;

export const numberWithDefault = (d: number) => {
  return z.union([
    z.number().nonnegative().default(d),
    z
      .string()
      //.refine((v) => /^[0-9]+$/.test(v))
      .transform((v) => parseInt(v)),
  ]);
};

export const booleanWithDefault = (d: "true" | "false") =>
  z.union([
    z.boolean().transform((v) => (v ? "true" : "false")),
    z.enum(["true", "false"]).default(d),
    z.number().max(1).nonnegative(),
  ]);

export const number = z.union([
  z.number().nonnegative(),
  z
    .string()
    // .refine((v) => /^[0-9]+$/.test(v))
    .transform((v) => parseInt(v)),
]);

export const numberArr = z.union([
  z.array(z.number()),
  z.string().transform((v) => v.split(",").map((v) => parseInt(v))),
]);

export const stringArr = z.union([
  z.array(z.string()),
  z.string().transform((v) => v.split(",")),
]);

export const boolean = z.union([
  z.boolean(),
  z
    .enum(["1", "0", "true", "false"])
    .transform((v) => v === "1" || v === "true"),
]);

export const path = z
  .string()
  .min(1)
  .max(100)
  .trim()
  .refine((v) => v.startsWith("/"));

export const string = z.any().transform((v) => `${v}`);

export const stringZeroOrOne = z.union([
  z.enum(["0", "1"]).optional().default("0"),
  z
    .number()
    .int()
    .refine((value) => value === 0 || value === 1)
    .transform((value) => `${value}`),
  z.boolean().transform((value) => (value ? "1" : "0")),
]);

export const stringMetaTable = z.enum([
  "post",
  "comment",
  "blog",
  "term",
  "user",
  "site",
]);

export const userRef = z.string().transform((val: string) => {
  if (val.match(/^\d+$/)) {
    return parseInt(val);
  }
  return val;
});

export const blogFlag = z.enum([
  "public",
  "archived",
  "mature",
  "spam",
  "deleted",
]);

export const filterRecordByFields = (
  data: string | Record<string, unknown> | Record<string, unknown>[],
  fields: string | string[] | undefined
) => {
  // If data is a string, return it as is
  if (typeof data === "string") {
    return data;
  }

  const fieldsSchema = z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((field) => field.trim())
            .filter((field) => field.length > 0)
        : []
    );

  const parsedFields = fieldsSchema.parse(
    Array.isArray(fields) ? fields.join(",") : fields
  );

  // If fields are specified, filter the result data
  if (0 == parsedFields.length) {
    return data;
  }

  const filterObject: (record: Record<string, any>) => Record<string, any> = (
    record: Record<string, any>
  ): Record<string, any> => {
    const filteredRecord: Record<string, any> = {};
    parsedFields.forEach((field) => {
      if (field in record) {
        filteredRecord[field] = record[field as keyof typeof record];
      }
    });
    return filteredRecord;
  };

  // If data is an object, filter it
  if (typeof data === "object" && !Array.isArray(data)) {
    return filterObject(data);
  }

  // If data is an array, filter each item
  if (Array.isArray(data)) {
    return data.map((item) => filterObject(item));
  }

  return data;
};
