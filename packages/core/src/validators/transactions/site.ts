import { z } from "zod";
import * as database from "../database";

export const siteUpsert = database.wpSite
  .omit({
    id: true,
  })
  .merge(
    z.object({
      id: z.number().optional(),
      meta_input: z.record(z.any()).optional().default({}),
    })
  );

export const siteInsert = siteUpsert.omit({
  meta_input: true,
});
