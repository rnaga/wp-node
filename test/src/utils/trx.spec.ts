import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TrxUtil } from "@rnaga/wp-node/core/utils/trx.util";
import * as val from "@rnaga/wp-node/validators";

test("trx", async () => {
  const context = await Application.getContext("single");

  const queryUtil = context.components.get(QueryUtil);
  const trxUtil = context.components.get(TrxUtil);
  const random = Math.floor(Math.random() * 10000);

  const postId = await trxUtil.post.upsert({
    post_author: 1,
    post_name: `_test_trx_${random}`,
    post_title: `__test_trx_${random}`,
  });

  const post = await queryUtil.posts((query) => {
    query.where("ID", postId).builder.first();
  }, val.database.wpPosts);

  expect(post?.post_title).toBe(`__test_trx_${random}`);
});
