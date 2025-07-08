import { z } from "zod";
import * as val from "../validators";

export type BlogUpsert = z.infer<typeof val.trx.blogUpsert>;
export type BlogUpdate = z.infer<typeof val.trx.blogUpdate>;
export type BlogInsert = z.infer<typeof val.trx.blogInsert>;

export type CommentUpsert = z.infer<typeof val.trx.commentUpsert>;
export type CommentUpdate = z.infer<typeof val.trx.commentUpdate>;
export type CommentInsert = z.infer<typeof val.trx.commentInsert>;

export type LinkUpsert = z.infer<typeof val.trx.linkUpsert>;
export type LinkUpdate = z.infer<typeof val.trx.linkUpdate>;
export type LinkInsert = z.infer<typeof val.trx.linkInsert>;

export type MetaUpdate = z.infer<typeof val.trx.metaUpdate>;

export type PostUpsert = z.infer<typeof val.trx.postUpsert>;
export type PostUpdate = z.infer<typeof val.trx.postUpdate>;
export type PostInsert = z.infer<typeof val.trx.postInsert>;

export type SignupInsert = z.infer<typeof val.trx.signupInsert>;

export type SiteUpsert = z.infer<typeof val.trx.siteUpsert>;
export type SiteInsert = z.infer<typeof val.trx.siteInsert>;

export type TermUpdate = z.infer<typeof val.trx.termUpdate>;
export type TermInsert = z.infer<typeof val.trx.termInsert>;

export type UserUpsert = z.infer<typeof val.trx.userUpsert>;
export type UserUpdate = z.infer<typeof val.trx.userUpdate>;
export type UserInsert = z.infer<typeof val.trx.userInsert>;
