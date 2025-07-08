import Application from "@rnaga/wp-node/application";
import { RevisionCrud } from "@rnaga/wp-node/crud/revision.crud";
import { PostTrx, RevisionTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("multi");

  const postTrx = context.components.get(PostTrx);
  const reivisonTrx = context.components.get(RevisionTrx);
  const revisionCrud = context.components.get(RevisionCrud);
  const { superAdmin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const postId = await postTrx.upsert({
    post_author: superAdmin.props?.ID,
    post_title: `__revision_crud_get_${Math.floor(Math.random() * 10000)}`,
  });

  const revisionId = await reivisonTrx.save(postId);

  expect(revisionId).not.toBe(undefined);

  const revision = await revisionCrud.get(postId, revisionId as number);

  expect(revision.data.post_type).toBe("revision");
  await context.current.assumeUser(subscriber);

  await expect(
    revisionCrud.get(postId, revisionId as number)
  ).rejects.toThrow();
});
