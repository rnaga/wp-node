import Application from "@rnaga/wp-node/application";
import { RevisionCrud } from "@rnaga/wp-node/crud/revision.crud";
import { PostTrx } from "@rnaga/wp-node/transactions/post.trx";
import { RevisionTrx } from "@rnaga/wp-node/transactions/revision.trx";
import { getTestUsers } from "../../../helpers";

test("list", async () => {
  const context = await Application.getContext("multi");
  const revisionCrud = context.components.get(RevisionCrud);
  const reivisonTrx = context.components.get(RevisionTrx);
  const postTrx = context.components.get(PostTrx);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const postId = await postTrx.upsert({
    post_author: superAdmin.props?.ID,
    post_title: `__revision_crud_list_${Math.floor(Math.random() * 10000)}`,
  });

  const revisionId = await reivisonTrx.save(postId);

  const revisions = await revisionCrud.list(postId, {
    search: "revision",
    include: [revisionId as number],
  });

  expect(revisions.data[0]?.ID).toBe(revisionId);
});
