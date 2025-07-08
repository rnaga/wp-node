import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TermCrud } from "@rnaga/wp-node/crud/term.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { getTestUsers } from "../../../helpers";

test("sync object", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);
  const queryUtil = context.components.get(QueryUtil);
  const termCrud = context.components.get(TermCrud);

  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const postId = await postTrx.upsert({
    post_title: `__test_crud_term_sync_${Math.floor(Math.random() * 10000)}`,
    post_content: `__test_crud_term_sync_${Math.floor(Math.random() * 10000)}`,
  });

  const postTag = await queryUtil.terms((query) => {
    query.where("taxonomy", "post_tag").builder.limit(1);
  });

  const newTermNames = [
    `__test_crud_term_sync_${Math.floor(Math.random() * 10000)}`,
    `__test_crud_term_sync_${Math.floor(Math.random() * 10000)}`,
    postTag?.[0].name ?? "Uncategorized",
  ];

  const result = await termCrud.syncObject(
    postId,
    newTermNames,
    "post_tag",
    true
  );
  expect(result.data?.length).toBeGreaterThan(0);

  const { data, info } = await termCrud.list(
    "post_tag",
    {
      post: postId,
    },
    {
      context: "edit",
    }
  );

  expect(data.length).toBeGreaterThan(0);
  expect(info.pagination.count).toBeGreaterThan(0);
});
