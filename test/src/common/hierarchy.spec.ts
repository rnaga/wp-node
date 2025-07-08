import Application from "@rnaga/wp-node/application";
import { hierarchy } from "@rnaga/wp-node/common";
import { CommentUtil } from "@rnaga/wp-node/core/utils/comment.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { CommentTrx } from "@rnaga/wp-node/transactions";

test("terms", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);

  const terms =
    (await queryUtil.terms((query) => {
      query.withChildren("taxonomy", ["category"]).groupBy("term_id");
    })) ?? [];

  const items = hierarchy.terms(terms);
  expect(Array.isArray(items[0].children)).toBe(true);
});

test("comments", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);

  const comments =
    (await queryUtil.comments((query) => {
      query.withChildren("comment_ID", [1]);
    })) ?? [];

  const items = hierarchy.comments(comments);
  expect(Array.isArray(items[0].children)).toBe(true);
});

test("posts", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);

  const posts = (await queryUtil.posts((query) => query)) ?? [];

  const items = hierarchy.posts(posts);
  expect(Array.isArray(items[0].children)).toBe(true);
});

test("map and flat term", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);

  const terms =
    (await queryUtil.terms((query) => {
      query.withChildren("taxonomy", ["category"]).groupBy("term_id");
    })) ?? [];

  const result = hierarchy.map("terms", terms, (term, index) => {
    return index;
  });
  expect(result.length).toBe(terms.length);

  const flat = hierarchy.flat("terms", terms);
  expect(flat[0].depth).toBe(0);
});

test("map and flat comment", async () => {
  const context = await Application.getContext("multi");
  const commentTrx = context.components.get(CommentTrx);
  const commentUtil = context.components.get(CommentUtil);

  const random = Math.floor(Math.random() * 1000000);

  const commentId = await commentTrx.upsert({
    comment_post_ID: 1,
    comment_author: `__map_author_${random}`,
    comment_author_email: `author_${random}@test.com`,
    comment_content: `__content__${random}`,
  });

  for (let id = commentId, i = 0; i < 3; i++) {
    id = await commentTrx.upsert({
      comment_post_ID: 1,
      comment_author: `__map_author_${i}_${random}`,
      comment_author_email: `author_${i}_${random}@test.com`,
      comment_content: `__content__${i}_${random}`,
      comment_parent: id,
    });
  }

  const comment = await commentUtil.get(commentId);
  const children = (await comment.children()) ?? [];

  let parentId = commentId;
  hierarchy.map("comments", children, (comment) => {
    expect(comment.comment_parent).toBe(parentId);
    parentId = comment.comment_ID;
  });

  const flat = hierarchy.flat("comments", children);
  expect(flat[0].depth).toBe(0);
  expect(flat[1].depth).toBe(1);
  expect(flat[2].depth).toBe(2);
});
