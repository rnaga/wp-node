import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { MetaTrx, PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("meta upsert (update) preserves nested JSON when skipUnslash is true", async () => {
  const context = await Application.getContext("multi");
  const metaTrx = context.components.get(MetaTrx);
  const postTrx = context.components.get(PostTrx);
  const queryUtil = context.components.get(QueryUtil);

  const { superAdmin } = await getTestUsers(context);
  await context.current.assumeUser(superAdmin);

  const postId = await postTrx.upsert({
    post_author: superAdmin.props?.ID,
    post_title: "meta update skip-unslash test",
    post_type: "post",
    post_status: "publish",
    meta_input: { _json_meta: "initial" },
  });

  const json = JSON.stringify({
    root: {
      children: [{ type: "paragraph", text: 'value: "42"' }],
      params: { pipe: { format: "YYYY-MM-DD" } },
    },
  });

  // Update the existing meta key with a JSON value
  await metaTrx.upsert("post", postId, "_json_meta", json, {
    skipUnslash: true,
  });

  const meta = await queryUtil.meta("post", (query) => {
    query.withIds([postId]).withKeys(["_json_meta"]);
  });

  expect((meta as any)[0].meta_value).toBe(json);
  expect(() => JSON.parse((meta as any)[0].meta_value)).not.toThrow();
});
