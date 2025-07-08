import Application from "@rnaga/wp-node/application";
import { LinkTrx, PostTrx, UserTrx } from "@rnaga/wp-node/transactions";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";

test("remove multisite", async () => {
  const context = await Application.getContext("multi");
  const userTrx = context.components.get(UserTrx);
  const linkTrx = context.components.get(LinkTrx);
  const postTrx = context.components.get(PostTrx);
  const queryUtil = context.components.get(QueryUtil);

  const random = Math.floor(Math.random() * 1000);
  const userLogin = `user_remove_test_multisite_${random}`;
  const userEmail = `${userLogin}@test.com`;

  const userId = await userTrx.upsert({
    user_email: userEmail,
    user_pass: "123456",
    user_login: userLogin,
    show_admin_bar_front: "false",
    role: "author",
    meta_input: {
      meta1: "12345",
      meta2: "6789",
    },
  });

  const metaBefore = await queryUtil.meta("user", (query) => {
    query.withIds([userId]).withKeys(["wp_capabilities"]);
  });
  console.log(metaBefore);

  const postId = await postTrx.upsert({
    post_author: userId,
    post_title: "__test__user_remove__",
    post_excerpt: "__test__user_remove__",
  });

  const linkId = await linkTrx.upsert({
    link_url: `http://localhost${random}`,
    link_name: `name_${random}`,
    link_notes: "_note_",
    link_owner: userId,
  });

  const result = await userTrx.remove(userId);
  expect(result).toBe(true);

  const links = await queryUtil.common("links", (query) => {
    query.where("link_id", linkId);
  });
  expect(links).toBe(undefined);

  const posts = await queryUtil.posts((query) => {
    query.where("ID", postId);
  });
  expect(posts).toBe(undefined);

  const meta = await queryUtil.meta("user", (query) => {
    query.withIds([userId]).withKeys(["wp_capabilities"]);
  });
  expect(meta).toBe(undefined);
});
