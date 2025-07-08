import Application from "@rnaga/wp-node/application";
import { RevisionUtil } from "@rnaga/wp-node/core/utils/revision.util";
import { PostTrx } from "@rnaga/wp-node/transactions/post.trx";
import * as helpers from "../../helpers";

test("getAutosave", async () => {
  const context = await Application.getContext("multi");
  const postTrx = context.components.get(PostTrx);
  const revisionUtil = context.components.get(RevisionUtil);

  const { superAdmin, editor } = await helpers.getTestUsers(context);

  const random = Math.floor(Math.random() * 1000000);

  const parentPostId = await postTrx.upsert({
    post_title: `Test Post ${random}`,
    post_name: `test-post_${random}`,
    post_author: superAdmin.props?.ID,
    post_type: "post",
    post_status: "publish",
  });

  const postId = await postTrx.upsert({
    post_parent: parentPostId,
    post_author: editor.props?.ID,
    post_type: "revision",
    post_status: "inherit",
    post_name: `${parentPostId}-autosave-v1`,
  });

  const result = await revisionUtil.getAutosave(parentPostId, editor.props?.ID);

  expect(result?.props?.ID).toBe(postId);
});
