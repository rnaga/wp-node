import { z } from "zod";
import * as database from "../database";

const metaValue = z.union([
  z.string(),
  z.number(),
  z.array(z.union([z.string(), z.number()])),
  z.record(z.string(), z.any()),
]);

export const postUpsert = database.wpPosts
  .merge(
    z.object({
      ID: z.number().nonnegative().optional(),
      import_id: z.number().nonnegative().optional().default(0),
      post_status: z.string().default("draft"),
      post_category: z.array(z.number()).optional(),
      comment_status: z.enum(["open", "closed"]).optional().default("open"),
      ping_status: z.enum(["open", "closed"]).default("open"),
      tags_input: z
        .union([
          z.array(z.number()),
          z.array(z.string().trim()),
          z.array(z.union([z.number(), z.string().trim()])),
        ])
        .optional()
        .default([]),
      tax_input: z
        .record(
          z.string(),
          z.union([
            z.array(z.string()), // For non-hierarchical taxonomy (names or slugs)
            z.array(z.number()), // For hierarchical taxonomy (term IDs)
            z.array(z.union([z.string(), z.number()])),
            //z.string(), // For non-hierarchical taxonomy (comma-separated string of names or slugs)
            //z.string(), // For hierarchical taxonomy (comma-separated string of IDs)
          ])
        )
        .optional(),
      meta_input: z.record(z.string(), metaValue).default({}).optional(),
      file: z.string().optional().default(""),
      context: z.string().optional().default(""),
    })
  )
  .required({
    post_author: true,
  });

export const postInsert = database.wpPosts.pick({
  post_author: true,
  post_date: true,
  post_date_gmt: true,
  post_content: true,
  post_content_filtered: true,
  post_title: true,
  post_excerpt: true,
  post_status: true,
  post_type: true,
  comment_status: true,
  ping_status: true,
  post_password: true,
  post_name: true,
  to_ping: true,
  pinged: true,
  post_modified: true,
  post_modified_gmt: true,
  post_parent: true,
  menu_order: true,
  post_mime_type: true,
  guid: true,
});

export const postUpdate = postInsert;
