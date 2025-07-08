import Application from "@rnaga/wp-node/application";
import { Comment } from "@rnaga/wp-node/core/comment";
import { Current } from "@rnaga/wp-node/core/current";
import { CommentUtil } from "@rnaga/wp-node/core/utils/comment.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import Database from "@rnaga/wp-node/database";

import { z } from "zod";

test("get a comment", async () => {
  const context = await Application.getContext("single");

  const comment = await context.components.asyncGetWithArgs(Comment, 1);

  expect(comment.props?.comment_ID).toBe(1);
});

test("metas", async () => {
  const context = await Application.getContext("single");
  const database = context.components.get(Database);
  const current = context.components.get(Current);
  const comment = await context.components.asyncGetWithArgs(Comment, 1);

  const metaKey = `meta_key_${Math.floor(Math.random() * 1000)}`;
  const metaValue = "meta_value";

  let commentMetaId = 0;
  const trx = await database.transaction;
  await trx
    .insert({
      comment_id: comment.props?.comment_ID,
      meta_key: metaKey,
      meta_value: metaValue,
    })
    .into(current.tables.get("commentmeta"))
    .then((v) => {
      console.log("meta", v);
      commentMetaId = v[0];
    });
  await trx.commit();

  const metas = await comment.meta.props();

  const trxDelete = await database.transaction;
  await trxDelete
    .table(current.tables.get("commentmeta"))
    .where("meta_id", commentMetaId)
    .del();
  await trxDelete.commit();

  expect(metas[metaKey]).toBe(metaValue);
});

test("parent", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);

  const comments = await queryUtil.comments((query) => {
    query.where("parent", 0, ">").builder.limit(10);
  });

  const comment = await context.components.asyncGet(Comment, [
    comments?.[0].comment_ID,
  ]);

  const parent = await comment.parent();
  expect(parent?.comment_ID).toBe(comment.props?.comment_parent);
});

test("children", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const commentUtil = context.components.get(CommentUtil);

  const parentId = ((await queryUtil.comments((query) => {
    query.where("parent", 0, ">");
  })) ?? [])[0]?.comment_parent as number;

  // Get children via query
  const results =
    (await queryUtil.comments(
      (query) => {
        query.withChildren("comment_ID", [parentId]);
        query.select(["parent", "ID"]);
      },
      z.array(
        z.object({
          comment_ID: z.number(),
          comment_parent: z.number(),
        })
      )
    )) ?? [];

  let commentIds = [0, ...results.map((comment) => comment.comment_ID)];

  results?.forEach((comment) => {
    expect(commentIds.includes(comment.comment_parent)).toBe(true);
  });

  // Via Comment
  const comment = await commentUtil.get(parentId);
  const results2 = await comment.children();

  expect(results2 && results2.length > 0).toBe(true);

  commentIds = [0, ...(results2?.map((comment) => comment.comment_ID) ?? [])];
  results2?.forEach((comment) => {
    expect(comment.comment_parent > 0).toBe(true);
  });
});

test("countChildren", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);

  const comments = await queryUtil.comments((query) => {
    query.where("parent", 0, ">").builder.limit(10);
  });

  const comment = await context.components.asyncGet(Comment, [
    comments?.[0].comment_parent,
  ]);

  const result = await comment.countChildren();
  expect(result).not.toBe(0);
});
