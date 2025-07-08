import Application from "@rnaga/wp-node/application";
import { Meta } from "@rnaga/wp-node/core/meta";
import { MetaUtil } from "@rnaga/wp-node/core/utils/meta.util";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";

import type * as types from "@rnaga/wp-node/types";

test("get meta", async () => {
  const context = await Application.getContext("multi");

  for (const table of [
    "post",
    "site",
    "user",
    "term",
    "comment",
    "blog",
  ] as types.MetaTable[]) {
    const meta = context.components.get(Meta, [table, 1]);
    const props = await meta.props();

    expect(typeof props).toBe("object");
  }
});

test("meta util", async () => {
  const context = await Application.getContext("multi");
  const metaUtil = context.components.get(MetaUtil);

  const meta = await metaUtil.get("post", 1).props();
  expect(typeof meta).toBe("object");
});

test("post util", async () => {
  const context = await Application.getContext("multi");
  const postUtil = context.components.get(PostUtil);

  const post = await postUtil.get(1);
  const fromToPost = postUtil.toPost(post.props as types.WpPosts);

  const meta = await fromToPost.meta.props();

  expect(typeof meta).toBe("object");
});
