import Application from "@rnaga/wp-node/application";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { MetaTrx } from "@rnaga/wp-node/transactions/meta.trx";

test("upsert", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const metaTrx = context.components.get(MetaTrx);

  const postId = 1;
  const metaKey = `__meta_upsert_test_${Math.floor(Math.random() * 1000)}`;
  let metaValue = "valuetest_insert";

  // Insert
  await metaTrx.upsert("post", postId, metaKey, metaValue);

  let meta = await queryUtil.meta("post", (query) => {
    query.withIds([postId]).withKeys([metaKey]);
  });

  if (!meta) {
    throw new Error("meta not found");
  }

  const metaId = meta[0].meta_id;
  expect(meta[0].meta_key).toBe(metaKey);
  expect(meta[0].meta_value).toBe(metaValue);

  metaValue = "valuetest_update";

  // Update
  await metaTrx.upsert("post", postId, metaKey, metaValue);

  meta = await queryUtil.meta("post", (query) => {
    query.withIds([postId]).withKeys([metaKey]);
  });

  if (!meta) {
    throw new Error("meta not found");
  }

  expect(meta[0].meta_id).toBe(metaId);
  expect(meta[0].meta_value).toBe(metaValue);

  // Duplicate
  const result = await metaTrx.upsert("post", postId, metaKey, metaValue);
  expect(result).toBe(false);

  // Serialize
  const metaValueJson = { a: 1, b: "2" };
  const metaKeyJson = `__meta_upsert_test_json_${Math.floor(
    Math.random() * 1000
  )}`;

  await metaTrx.upsert("post", postId, metaKeyJson, metaValueJson, {
    serialize: true,
  });

  meta = await queryUtil.meta("post", (query) => {
    query.withIds([postId]).withKeys([metaKeyJson]);
  });

  if (!meta) {
    throw new Error("meta not found");
  }

  expect(meta[0].meta_value).toBe('a:2:{s:1:"a";i:1;s:1:"b";s:1:"2";}');
});

test("remove", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const metaTrx = context.components.get(MetaTrx);

  const postIds = [1, 2];
  const metaKey = `__meta_remove_test_${Math.floor(Math.random() * 1000)}`;
  const metaValue = "valuetest";

  // Create a meta to delete
  await metaTrx.upsert("post", postIds[0], metaKey, metaValue);

  await metaTrx.remove("post", {
    key: metaKey,
    objectId: postIds[0],
  });

  // Delete all meta key
  await metaTrx.upsert("post", postIds[0], metaKey, metaValue);
  await metaTrx.upsert("post", postIds[1], metaKey, metaValue);

  await metaTrx.remove("post", {
    key: metaKey,
    value: metaValue,
    deleteAll: true,
  });

  const meta = await queryUtil.meta("post", (query) => {
    query.withKeys([metaKey]);
  });

  expect(typeof meta == "undefined").toEqual(true);
});

test("removeByIds", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const metaTrx = context.components.get(MetaTrx);
  const postUtil = context.components.get(PostUtil);

  const postId = 1
  const metaKey = `__meta_remove_byids_test_${Math.floor(Math.random() * 1000)}`;
  const metaValue = "valuetest";

  // Create a meta to delete
  await metaTrx.upsert("post", postId, metaKey, metaValue);

  // Get post along with meta_id
  const post = await postUtil.get(postId);
  if (!post) {
    throw new Error("post not found");
  }

  const meta = await queryUtil.meta("post", (query) => {
    query.withKeys([metaKey]);
  });

  const metaIds = meta?.map((m) => m.meta_id) || [];

  await metaTrx.removeByIds("post", postId, metaIds);

  const metaAfter = await queryUtil.meta("post", (query) => {
    query.withKeys([metaKey]);
  });

  expect(typeof metaAfter == "undefined").toEqual(true);
});

test("removeAll", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  const metaTrx = context.components.get(MetaTrx);

  const objectId = 999999;

  const metaKeys = ["key1", "key2", "key4"];
  const metaValue = "valuetest";

  for (const metaKey of metaKeys) {
    await metaTrx.upsert("post", objectId, metaKey, metaValue);
  }

  let metas = await queryUtil.meta("post", (query) => {
    query.withIds([objectId], { joinPrimary: false });
  });

  expect(metas && metas.length > 0).toBe(true);

  await metaTrx.removeObject("post", objectId);

  metas = await queryUtil.meta("post", (query) => {
    query.withIds([objectId]);
  });

  expect(typeof metas == "undefined").toEqual(true);
});
