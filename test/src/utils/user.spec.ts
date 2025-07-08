import Application from "@rnaga/wp-node/application";
import { checkPassword, generatePassword } from "@rnaga/wp-node/common";
import { User } from "@rnaga/wp-node/core/user";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { UserTrx } from "@rnaga/wp-node/transactions/user.trx";
import * as val from "@rnaga/wp-node/validators";
import { z } from "zod";

test("get a unique userLogin", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);
  const queryUtil = context.components.get(QueryUtil);

  const userLogin = await userUtil.getUniqueUserLogin();

  expect(userLogin).toMatch(/^user-/);

  const users = await queryUtil.users((query) => query.where("ID", 1));

  context.hooks.filter.add("core_unigue_user_login", async (userLogin) => {
    return users?.[0].user_login ?? userLogin;
  });

  const userLogin2 = await userUtil.getUniqueUserLogin();

  expect(userLogin2).toMatch(/2$/);
});

test("get a unique nicename", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);
  const queryUtil = context.components.get(QueryUtil);

  const users = await queryUtil.users((query) => query.where("ID", 1));

  const existingNicename = (users as { user_nicename: string }[])[0]
    .user_nicename;
  const nicename = await userUtil.getUniqueNicename(
    existingNicename,
    "__new_user_login__"
  );

  expect(nicename).toBe(`${existingNicename}-2`);
});

test("get user", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);
  const queryUtil = context.components.get(QueryUtil);

  const user = await userUtil.get(1);

  const userDB = await queryUtil.users((query) => {
    query.get(1);
  }, val.database.wpUsers);

  const userClone = await context.components.asyncGet(User, [0, userDB]);

  expect(user.props?.ID).toBe(userClone.props?.ID);
});

test("reset password", async () => {
  const context = await Application.getContext("single");
  const userTrx = context.components.get(UserTrx);

  // Create user
  const random = Math.floor(Math.random() * 10000);
  const userId = (await userTrx.upsert({
    user_email: `test_reset_password_${random}@test.com`,
    user_pass: "123456",
    user_login: `___user_reset_password_${random}`,
    role: "author",
  })) as number;

  const userUtil = context.components.get(UserUtil);
  let user = await userUtil.get(userId);

  const password = user.props?.user_pass;

  const newPassword = generatePassword();
  await userUtil.resetPassword(user, newPassword);
  user = await userUtil.get(userId);

  expect(password).not.toBe(user.props?.user_pass);
  expect(checkPassword(newPassword, user.props?.user_pass as string)).toBe(
    true
  );
});

test("Activation key to reset password", async () => {
  const context = await Application.getContext("multi");
  const userTrx = context.components.get(UserTrx);

  let actionHookResetKey = "";
  context.hooks.action.add(
    "core_reset_password",
    async (resetKey, user, siteName) => {
      actionHookResetKey = resetKey;
      console.log(
        `action hook core_reset_password - resetKey: ${resetKey}, user: ${user.props?.ID} siteName: ${siteName}`
      );
    }
  );

  // Create user
  const random = Math.floor(Math.random() * 10000);
  const userId = await userTrx.upsert({
    user_email: `test_activation_key_${random}@test.com`,
    user_pass: "123456",
    user_login: `___user_activation_key_${random}`,
    role: "author",
  });

  const userUtil = context.components.get(UserUtil);
  const user = await userUtil.get(userId);

  // Create reset key
  let resetKey = "";
  if (!user.props?.user_login) {
    expect(false).toBe(true);
  } else {
    resetKey = await userUtil.getPasswordResetKey(user.props?.user_login);
  }

  expect(resetKey).toBe(actionHookResetKey);

  // Check reset key
  let result = await userUtil.checkPasswordResetKey(resetKey, userId);
  expect(typeof result == "number").toBe(true);
  // Check if activation key has been revoked
  result = await userUtil.checkPasswordResetKey(resetKey, userId);
  expect(result).toBe(false);
});

test("toUsers", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);
  const queryUtil = context.components.get(QueryUtil);

  const users = await queryUtil.users((query) => {
    query.where("ID", 1);
  });

  if (!users) {
    expect(false).toBe(true);
  } else {
    const result = await userUtil.toUsers(users);
    expect(result && result.length > 0).toBe(true);
    const role = await result[0].role();

    expect(role.names.size > 0).toBe(true);
  }
});

test("countPosts", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);

  const counts = await userUtil.countPosts([1, 2]);

  expect(counts && counts[0].post_author > 0).toBe(true);
});

test("getRoleNames", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);

  const roleNamesMap = await userUtil.getRoleNames(1);

  for (const [, roleNames] of roleNamesMap) {
    expect(roleNames.includes("superadmin"));
  }
});

test("getPrimaryBlogId", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);
  const queryUtil = context.components.get(QueryUtil);

  const meta = await queryUtil.meta(
    "user",
    (query) => {
      query
        .withKeys(["primary_blog"])
        .builder.orderBy("meta_value", "desc")
        .first();
    },
    z.any()
  );

  const userId = meta.user_id;
  const metaValue = parseInt(meta.meta_value);

  const blogId = await userUtil.getPrimaryBlogId(userId);

  expect(blogId).toBe(metaValue);
});

test("getSingleSite", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);

  const site = await userUtil.getSingleSite(1);

  expect(site.primary_blog.blogname).toBe("wptest");
});

test("getSites", async () => {
  let context = await Application.getContext("single");
  let userUtil = context.components.get(UserUtil);

  let site = await userUtil.getSites(1);

  expect(site.primary_blog?.blogname).toBe("wptest");
  expect(site.is_multisite).toBe(false);

  context = await Application.getContext("multi");
  userUtil = context.components.get(UserUtil);

  site = await userUtil.getSites(1);

  expect(site.is_multisite).toBe(true);
  expect(site.sites && site.sites.length > 0);
});

test("getSiteIds", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);

  const counts = await userUtil.getSiteIds(1);

  expect(counts).toContain(1);
});

test("checkSuperAdminStatus - multisite", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);
  const user = await userUtil.get(1);

  const [isTrue, siteIds] = await userUtil.checkSuperAdminStatus(user, {
    blogIds: [1],
  });

  expect(isTrue).toBe(true);
  expect(siteIds).toContain(1);
});

test("checkSuperAdminStatus - single site", async () => {
  const context = await Application.getContext("single");
  const userUtil = context.components.get(UserUtil);
  const user = await userUtil.get(1);

  const [isTrue, siteIds] = await userUtil.checkSuperAdminStatus(user);

  expect(isTrue).toBe(true);
  expect(siteIds).toContain(1);
});

test("hasCapabilities - multisite", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);
  const user = await userUtil.get(1);

  await context.current.switchBlog(1);
  let isTrue = await userUtil.hasCapabilities(user, ["list_users"]);
  expect(isTrue).toBe(true);

  const queryUtil = context.components.get(QueryUtil);
  const authorId = (
    (await queryUtil.users((query) => {
      query.withRoles(["author"]);
    })) ?? []
  ).map((user) => user.ID)?.[0];

  isTrue = await userUtil.hasCapabilities(authorId, ["list_users"]);
  expect(isTrue).toBe(false);

  isTrue = await userUtil.hasCapabilities(authorId, ["read", "publish_posts"]);
  expect(isTrue).toBe(true);
});

test("hasCapabilities - single site", async () => {
  const context = await Application.getContext("multi");
  const userUtil = context.components.get(UserUtil);
  const user = await userUtil.get(1);

  await context.current.switchBlog(1);
  const isTrue = await userUtil.hasCapabilities(user, ["list_users"]);
  expect(isTrue).toBe(true);
});
