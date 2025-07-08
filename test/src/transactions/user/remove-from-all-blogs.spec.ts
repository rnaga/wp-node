import Application from "@rnaga/wp-node/application";
import { Installer } from "@rnaga/wp-node/core/installer";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { BlogTrx, PostTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as helpers from "../../../helpers";

test("multisite", async () => {
  const dbName = "wptest-user-remove-from-all-blogs-test-multi";
  const testAppName = "user_remove_from_all_blogs_test_multi";

  // Create a test database
  await helpers.createDatabase(dbName);

  Application.configs = {
    ...helpers.getBaseAppConfig(),
    ...helpers.getAppConfig({
      appName: testAppName,
      isMulti: true,
      database: {
        user: "root",
        password: "root",
        database: dbName,
      },
    }),
  };

  const context = await Application.getContext(testAppName);

  const blogTrx = context.components.get(BlogTrx);
  const userTrx = context.components.get(UserTrx);
  const installer = context.components.get(Installer);
  const postTrx = context.components.get(PostTrx);
  const queryUtil = context.components.get(QueryUtil);

  const random = Math.floor(Math.random() * 100000);

  const userName = "__user_remove_from_all_blogs_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "user_remove_from_all_blogs_sitename";

  const { userId: siteUserId } = await installer.install({
    siteUrl: helpers.siteUrl,
    blogTitle: "__installer_blog__",
    userName,
    userEmail,
    isPublic: true,
  });

  // Initialize site and create a primary blog
  const siteId = await installer.initializeSite(
    {
      domain,
      email: userEmail,
      siteName,
      path: "/site",
    },
    {
      subdomainInstall: true,
    }
  );

  // Create second blogs
  const secondBlogId = await blogTrx.upsert({
    site_id: siteId,
    user_id: siteUserId,
    path: `/user_remove_from_all_blogs_${random}`,
    domain: "localhost",
  });

  const userLogin = `user_remove_from_all_blogs_${random}`;
  const userId = await userTrx.upsert(
    {
      user_email: `user_remove_from_all_blogs_${random}@test.com`,
      user_pass: "123456",
      user_login: userLogin,
    },
    {
      attachRole: false,
    }
  );

  await userTrx.upsertRole(userId, "administrator");

  // Create post in primary blog
  const postId = await postTrx.upsert({
    post_author: userId,
    post_title: "__test__",
  });

  await context.current.switchBlog(secondBlogId);
  await userTrx.upsertRole(userId, "administrator");

  // Create post in secondary blog
  const postId2 = await postTrx.upsert({
    post_author: userId,
    post_title: "__test2__",
  });

  await userTrx.removeFromAllBlogs(userId, {
    1: siteUserId,
    [secondBlogId]: siteUserId,
  });

  // Check if post is reassigned
  const post2 = await queryUtil.posts((query) => {
    query.where("ID", postId2);
  });
  expect(post2?.[0].post_author).toBe(siteUserId);

  await context.current.switchBlog(1);

  const post = await queryUtil.posts((query) => {
    query.where("ID", postId);
  });
  expect(post?.[0].post_author).toBe(siteUserId);

  const user = await queryUtil.users((query) => {
    query.where("ID", userId);
  });

  expect(user).toBe(undefined);

  await helpers.dropDatabase(dbName);
});
