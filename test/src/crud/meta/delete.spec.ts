import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { MetaCrud } from "@rnaga/wp-node/crud/meta.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("delete", async () => {
  const context = await Application.getContext("multi");
  const metaCrud = context.components.get(MetaCrud);
  const postTrx = context.components.get(PostTrx);
  const queryUtil = context.components.get(QueryUtil);

  const { superAdmin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const postId = await postTrx.upsert({
    post_author: superAdmin.props?.ID,
    post_title: "test meta form data",
    post_name: "test",
    post_type: "post",
    post_status: "publish",
    meta_input: { test: "54321", test2: "67890" },
  });

  await metaCrud.delete("post", postId, ["test"]);

  const meta = await queryUtil.meta("post", (query) => {
    query.withIds([postId]).withKeys(["test"]);
  });

  expect(meta).toBe(undefined);

  // Permission error
  await context.current.assumeUser(subscriber);

  await expect(metaCrud.delete("post", postId, ["test2"])).rejects.toThrow();
});
