import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { formatting } from "@rnaga/wp-node/common";
import { Installer } from "@rnaga/wp-node/core/installer";
import { Tables } from "@rnaga/wp-node/core/tables";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { BlogTrx, UserTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";
import * as helpers from "../../../helpers";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { MetaUtil } from "@rnaga/wp-node/core/utils/meta.util";

test("add user to blog", async () => {
  const dbName = "wptest-add-remove-user-test-multi";
  const testAppName = "add_remove_user_test_multi";

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
  const queryUtil = context.components.get(QueryUtil);
  const installer = context.components.get(Installer);

  const random = Math.floor(Math.random() * 100000);

  const userName = "__add_remove_user_test_";
  const userEmail = `${userName}@example.com`;

  const domain = "localhost";
  const siteName = "add_remove_user_sitename";

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

  // Create a new blog
  const blogId = await blogTrx.upsert({
    site_id: siteId,
    user_id: siteUserId,
    path: `/test_add_remove_user_${random}`,
    domain: "localhost",
  });

  //let blog = await context.components.get(BlogUtil).get(blogId);

  const userLogin = `test_add_remove_to_blog_${random}`;
  const userId = await userTrx.upsert(
    {
      user_email: `test_add_remove_to_blog_${random}@test.com`,
      user_pass: "123456",
      user_login: userLogin,
    },
    {
      attachRole: false,
    }
  );

  // Add user to blog
  let result = await blogTrx.addUser(blogId, userId, "editor");
  expect(result).toBe(true);

  const userMetas = await queryUtil.usingBlog(blogId).meta(
    "user",
    (query) => {
      query.withIds([userId]);
    },
    z.array(val.database.wpUserMeta)
  );

  if (!userMetas) {
    expect(false).toBe(true);
  } else {
    // primary blog
    let meta = userMetas.filter((v) => v.meta_key == "primary_blog")[0];
    expect(formatting.primitive(meta.meta_value)).toBe(blogId);

    // source_domain
    meta = userMetas.filter((v) => v.meta_key == "source_domain")[0];
    expect(meta.meta_value).toBe("localhost");

    // wp_capabilities
    const tables = context.components.get(Tables);
    tables.index = blogId;
    const key = `${tables.prefix}capabilities`;
    meta = userMetas.filter((v) => v.meta_key == key)[0];
    const json = formatting.primitive(meta.meta_value) as Record<
      string,
      boolean
    >;
    expect(json["editor"]).toBe(true);
  }

  // Test to remove user from blog

  // Create user without role
  const userLoginToReassign = `test_add_remove_to_blog_reassign_${random}`;
  const userIdToReassign = await userTrx.upsert(
    {
      user_email: `test_add_remove_to_blog_reassign_${random}@test.com`,
      user_pass: "123456",
      user_login: userLoginToReassign,
    },
    {
      attachRole: false,
    }
  );

  // Add user to blog
  await blogTrx.addUser(blogId, userIdToReassign, "editor");

  const newBlogId = await blogTrx.upsert({
    site_id: siteId,
    user_id: siteUserId,
    path: `/test_add_remove_user_new_${random}`,
    domain: "localhost",
  });

  const metaUtil = context.components.get(MetaUtil);
  const userUtil = context.components.get(UserUtil);

  // Add user to another blog as super admin
  await blogTrx.addUser(newBlogId, userId, "editor", {
    superAdmin: true,
  });

  let metaValue = await metaUtil.getValue<string[]>(
    "site",
    siteId,
    "site_admins"
  );
  const user = await userUtil.get(userId);

  expect(
    user.props?.user_login && metaValue?.includes(user.props?.user_login)
  ).toBe(true);

  let roleNames = await userUtil.getRoleNames(user);
  expect(roleNames.get(blogId)).toContain("editor");

  // Remove user from the first blog
  result = await blogTrx.removeUser(blogId, userId);

  console.log(`userId: ${userId} userIdToReassign: ${userIdToReassign}`);

  metaValue = await metaUtil.getValue<string[]>("site", siteId, "site_admins");

  // Note: user will hold super admin role but all other roles will be removed
  expect(
    user.props?.user_login && metaValue?.includes(user.props?.user_login)
  ).toBe(true);

  roleNames = await userUtil.getRoleNames(userId);
  expect(roleNames.get(blogId)).not.toContain("editor");

  await helpers.dropDatabase(dbName);
});
