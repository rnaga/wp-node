import { z } from "zod";
import * as database from "../database";

export const blogUpsertBase = database.wpBlogs
  .omit({
    blog_id: true,
  })
  .merge(
    z.object({
      blog_meta: z.record(z.any()).optional().default({}),
    })
  );

export const blogUpsert = z.union([
  blogUpsertBase.partial().merge(
    z.object({
      blog_id: z.number().int().nonnegative(),
      title: z.undefined(),
      options: z.undefined(),
      user_id: z.undefined(),
    })
  ),
  blogUpsertBase.partial().merge(
    z.object({
      user_id: z.number().int().nonnegative(),
      title: z.union([z.string().optional().default(""), z.undefined()]),
      options: z.union([z.record(z.any()).optional(), z.undefined()]),
      blog_id: z.undefined(),
    })
  ),
]);

export const blogInsert = database.wpBlogs.omit({
  blog_id: true,
});

export const blogUpdate = blogInsert;
