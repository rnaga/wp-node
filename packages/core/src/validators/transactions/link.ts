import { z } from "zod";
import * as database from "../database";

export const linkUpsert = database.wpLinks
  .omit({
    link_updated: true,
  })
  .merge(
    z.object({
      link_id: z.number().int().nonnegative().optional(),
      link_category: z.array(z.number()).optional(),
      link_target: z
        .string()
        .optional()
        .default("")
        .transform((v) => (v !== "_top" && v !== "_blank" ? "" : v)),
      link_visible: z
        .string()
        .optional()
        .default("Y")
        .transform((v) => v.replace(/[^YNyn]/g, "")),
    })
  );

export const linkInsert = database.wpLinks.omit({
  link_id: true,
});

export const linkUpdate = linkInsert;
