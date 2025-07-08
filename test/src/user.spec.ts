import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { User } from "@rnaga/wp-node/core/user";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { PostTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";

test("application with single site", async () => {
  const context = await Application.getContext("single");

  const user = await context.components.asyncGet(User, [1]);

  expect(user.props?.ID).toBe(1);

  const annonUser = await context.components.asyncGet(User);
  const annonRole = await annonUser.role();

  expect(annonRole.names.has("anonymous")).toEqual(true);
});

test("super admin", async () => {
  const context = await Application.getContext("multi");

  const user = await context.components.asyncGet(User, [1]);
  const role = await user.role();
  expect(role.isSuperAdmin()).toBe(true);
  expect(role.isAdmin()).toBe(true);
});

test("capabilities", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);
  const postUtil = context.components.get(PostUtil);

  const userTrx = context.components.get(UserTrx);

  const random = Math.floor(Math.random() * 100000);
  const input: Partial<z.infer<typeof val.trx.userUpsert>> = {
    user_email: `testuser_${random}@test.com`,
    user_pass: "123456",
    user_login: `___user_editor_login_${random}`,
    show_admin_bar_front: "false",
    role: "editor",
  };

  const editorId = await userTrx.upsert(input);
  const editor = await userUtil.get(editorId);

  let can = await editor.can("create_sites");
  expect(can).toBe(false);

  const postTrx = context.components.get(PostTrx);

  const postId = await postTrx.upsert({
    post_author: editorId,
    post_title: `test user title ${random}`,
    post_name: `test ${random}`,
    post_type: "post",
  });

  const post = await postUtil.get(postId);
  expect(typeof post.props?.ID == "number").toBe(true);

  // editor can edit their post / page
  can = await editor.can("edit_post", post.props?.ID as number);
  expect(can).toBe(true);
}, 30000);

test("usermeta", async () => {
  const context = await Application.getContext("single");
  const user = await context.components.asyncGet(User, [1]);
  const metas = await user.meta.props();
  expect(Object.entries(metas).length > 0).toBe(true);
});

test("multi roles", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);

  const userTrx = context.components.get(UserTrx);

  const random = Math.floor(Math.random() * 10000);
  const input: Partial<z.infer<typeof val.trx.userUpsert>> = {
    user_email: `testuser_${random}@test.com`,
    user_pass: "123456",
    user_login: `___user_multi_roles_login_${random}`,
    show_admin_bar_front: "false",
    role: ["author", "subscriber", "editor"],
  };

  const userId = await userTrx.upsert(input);
  const user = await userUtil.get(userId);

  const role = await user.role();

  expect(role.is("editor")).toBe(true);
  expect(role.is("subscriber")).toBe(true);
  expect(role.is("author")).toBe(true);
}, 30000);

test("bulkCan", async () => {
  const context = await Application.getContext("multi");
  const superAdmin = await context.components.asyncGet(User, [1]);

  const results = await superAdmin.bulkCan([
    ["edit_post", 1],
    ["edit_comment", 1],
    ["edit_posts"],
  ]);

  for (const [action, args, result] of results) {
    expect(action).toMatch(/^edit_post|edit_comment|edit_posts$/);
    expect(Array.isArray(args) || typeof args === "undefined").toBe(true);
    expect(result).toBe(true);
  }

  const results2 = await superAdmin.bulkCan("edit_post", [[1], [2], [99999]]);
  for (const [action, args, result] of results2) {
    expect(action).toBe("edit_post");
    expect(Array.isArray(args)).toBe(true);
    expect(typeof result).toBe("boolean");
  }
});
