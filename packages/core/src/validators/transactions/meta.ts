import { z } from "zod";

import type * as types from "../../types";
export const metaUpdate = z.object({
  meta_value: z
    .any()
    .transform((v) =>
      typeof v == "undefined" ? "" : new String(v).toString()
    ),
});

export const metaInsert = (table: types.MetaTable) =>
  z.object({
    [`${table}_id`]: z.number().int().nonnegative(),
    meta_key: z.string().max(255).trim(),
    meta_value: z.union([
      z.string().trim().nullable(),
      z.any().transform((v) => v.toString()),
    ]),
  });
