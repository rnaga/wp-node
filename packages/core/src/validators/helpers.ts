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
