import { z } from "zod";
import * as database from "./database";

export const schemaDepth = z.object({
  depth: z.number().optional().default(0),
});

const schemaTerms =
  // z
  //   .object({
  //     depth: z.number().optional().default(0),
  //   })
  schemaDepth.merge(
    database.wpTerms.merge(
      database.wpTermTaxonomy.merge(database.wpTermRelationships)
    )
  );

//const schemaTerms = database.wpTerms.merge(database.wpTermTaxonomy);

//.merge(database.wpTermRelationships);

export const termsResult = z.array(schemaTerms).nonempty();

export const termRelationshipsResult = z
  .array(database.wpTermRelationships)
  .nonempty();

export const termsGroupMaxCountResult = z.array(z.object({ max: z.number() }));

// Posts
export const postsResult = z.array(database.wpPosts).nonempty();

// Comments
export const commentsResult = z
  .array(schemaDepth.merge(database.wpComments))
  .nonempty();

// Users
export const usersResult = z.array(database.wpUsers).nonempty();

// Meta
export const metaResult = z
  .array(
    z.object({
      meta_id: z.number().int().nonnegative().default(0),
      umeta_id: z.number().int().nonnegative().default(0),
      meta_key: z.string().max(255).trim().nullable(),
      meta_value: z.string().trim().nullable(),
    })
  )
  .nonempty();

export const metaPostResult = z.array(database.wpPostMeta).nonempty();
export const metaCommentResult = z.array(database.wpCommentMeta).nonempty();
export const metaBlogResult = z.array(database.wpBlogMeta).nonempty();
export const metaTermResult = z.array(database.wpTermMeta).nonempty();
export const metaUserResult = z.array(database.wpUserMeta).nonempty();
export const metaSiteResult = z.array(database.wpSiteMeta).nonempty();

// Blogs
export const blogsResult = z.array(database.wpBlogs).nonempty();

// Sites
export const sitesResult = z.array(database.wpSite).nonempty();

// Options
export const optionsResult = database.wpOptions;

// Signups
export const signupsResult = z.array(database.wpSignups).nonempty();

// Registration Log
export const registrationLogResult = z
  .array(database.wpRegistrationLog)
  .nonempty();

// Links
export const linksResult = z.array(database.wpLinks).nonempty();

// Count
export const resultCount = z.object({ count: z.number() }).optional();

export const resultCountGroupBy = (column: string) =>
  z
    .array(
      z.object({
        [column as any]: z
          .union([z.string(), z.number()])
          .transform((v) => String(v)),
        count: z.union([z.number(), z.unknown()]).transform((v) => {
          if (typeof v === "string") {
            return parseInt(v);
          } else if (typeof v !== "number") {
            return 0;
          }
          return v;
        }),
      })
    )
    .optional();
