import Application from "@rnaga/wp-node/application";

test("utils", async () => {
  const context = await Application.getContext("multi");

  const posts = await context.utils.query.posts((query) => {
    query.where("ID", 1);
  });

  expect((posts as any)[0].ID).toBe(1);

  const postId = await context.utils.trx.post.upsert({
    post_author: 1,
    post_title: "___test_utils___",
    post_content: "___test_utils_content__",
  });

  expect(postId > 0).toBe(true);
});
