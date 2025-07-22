import { z } from "zod";
import * as database from "../database";

const commentAuthor = z
  .string() //database.wpComments.shape.comment_author
  .optional()
  .default("");

export const commentUpsert = database.wpComments
  .omit({
    comment_approved: true,
    comment_ID: true,
    comment_author: true,
  })
  .merge(
    z.object({
      comment_ID: z.number().int().nonnegative().optional(),
      comment_author: commentAuthor,
      comment_approved: z.union([
        z.enum(["hold", "approve"]).transform((v) => (v == "hold" ? "0" : "1")),
        database.wpComments.shape.comment_approved,
      ]),
      comment_content: z.string().min(1).trim().max(65525),
      comment_meta: z.record(z.string(), z.any()).optional().default({}),
    })
  );

export const commentUpdate = database.wpComments
  .omit({
    comment_author: true,
  })
  .merge(
    z.object({
      comment_author: commentAuthor,
    })
  );

export const commentInsert = commentUpdate.omit({
  comment_ID: true,
});
