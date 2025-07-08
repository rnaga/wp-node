import Application from "@rnaga/wp-node/application";
// import { Installer } from "@rnaga/wp-node/core/installer";
// import { UserCrud } from "@rnaga/wp-node/crud/user.crud";
// import { BlogTrx, UserTrx } from "@rnaga/wp-node/transactions";
// import * as helpers from "../../../helpers";

afterAll(() => {
  Application.terminate();
});

test("getSites - multisite", async () => {});

// test("getSites - multisite", async () => {
//   const dbName = "wptest-user-get-sites-crud-test-multi";
//   const testAppName = "user_get_sites_crud_test_multi";

//   // Create a test database
//   await helpers.createDatabase(dbName);

//   Application.configs = {
//     ...helpers.getBaseAppConfig(),
//     ...helpers.getAppConfig({
//       appName: testAppName,
//       isMulti: true,
//       database: {
//         user: "root",
//         password: "root",
//         database: dbName,
//       },
//     }),
//   };

//   const context = await Application.getContext(testAppName);

//   const blogTrx = context.components.get(BlogTrx);
//   const userTrx = context.components.get(UserTrx);
//   const installer = context.components.get(Installer);

//   const random = Math.floor(Math.random() * 100000);

//   const userName = "__user_get_sites__crud_test_";
//   const userEmail = `${userName}@example.com`;

//   const domain = "localhost";
//   const siteName = "user_get_sites_crud_sitename";

//   const { userId: siteUserId } = await installer.install({
//     blogTitle: "__installer_blog__",
//     userName,
//     userEmail,
//     isPublic: true,
//   });

//   // Initialize site and create a primary blog
//   const firstSiteId = await installer.initializeSite(
//     {
//       domain,
//       email: userEmail,
//       siteName,
//       path: "/site",
//     },
//     {
//       subdomainInstall: true,
//     }
//   );

//   const firstBlogIds = [];

//   for (let i = 0; i <= 1; i++) {
//     firstBlogIds.push(
//       await blogTrx.upsert({
//         site_id: firstSiteId,
//         user_id: siteUserId,
//         path: `/user_get_sites_crud_${i}_${random}`,
//         domain: "localhost",
//       })
//     );
//   }

//   const secondSiteId = await installer.initializeSite(
//     {
//       domain,
//       email: userEmail,
//       siteName,
//       path: "/site_2",
//     },
//     {
//       subdomainInstall: true,
//     }
//   );
//   const secondBlogIds = [];

//   for (let i = 0; i <= 1; i++) {
//     secondBlogIds.push(
//       await blogTrx.upsert({
//         site_id: secondSiteId,
//         user_id: siteUserId,
//         path: `/user_2_get_sites_crud_${i}_${random}`,
//         domain: "localhost2",
//       })
//     );
//   }

//   // Add users
//   const users = [];
//   for (let i = 0; i <= 2; i++) {
//     const userLogin = `user_get_sites_crud_list_${i}_${random}`;
//     users.push(
//       await userTrx.upsert(
//         {
//           user_email: `user_crud_list_${i}_${random}@test.com`,
//           user_pass: "123456",
//           user_login: userLogin,
//         },
//         {
//           attachRole: false,
//         }
//       )
//     );
//   }

//   const firstUserId = users[0];
//   const secondUserId = users[1];
//   const thirdUserId = users[2];

//   // Add roles
//   await blogTrx.addUser(firstBlogIds[0], firstUserId, "administrator");
//   await blogTrx.addUser(firstBlogIds[1], firstUserId, "editor");
//   await blogTrx.addUser(secondBlogIds[0], firstUserId, "author");
//   await blogTrx.addUser(secondBlogIds[1], firstUserId, "author");

//   await blogTrx.addUser(firstBlogIds[0], secondUserId, "administrator");
//   await blogTrx.addUser(firstBlogIds[1], secondUserId, "administrator");
//   await blogTrx.addUser(secondBlogIds[0], secondUserId, "administrator");
//   await blogTrx.addUser(secondBlogIds[1], secondUserId, "administrator");

//   const userCrud = context.components.get(UserCrud);

//   // First user has one admin role in 1st site & 1st blog
//   await context.current.assumeUser(firstUserId);

//   const sites = await userCrud.getSites(secondUserId);
//   expect(sites.data.primary_blog?.site_id).toBe(firstSiteId);
//   expect(sites.data.sites?.length).toBe(1);
//   expect(sites.data.sites?.[0].blogs?.[0].blog_id).toBe(firstBlogIds[0]);

//   // own user can see all sites and blogs (2 sites & 4 blogs)
//   const sites2 = await userCrud.getSites(firstUserId);
//   //console.log(sites2, sites2.data.sites);

//   expect(sites2.data.sites?.length).toBe(2);
//   expect(sites2.data.sites?.[0].blogs?.length).toBe(2);
//   expect(sites2.data.sites?.[1].blogs?.length).toBe(2);

//   // Second user has admin role in all sites & blogs
//   await context.current.assumeUser(secondUserId);
//   const sites3 = await userCrud.getSites(firstUserId);
//   expect(sites3.data.sites?.length).toBe(2);
//   expect(sites3.data.sites?.[0].blogs?.length).toBe(2);
//   expect(sites3.data.sites?.[1].blogs?.length).toBe(2);

//   // // Can't edit since user is not super admin
//   // expect(sites3.data.sites?.[1].blogs?.[0].can_edit).toBe(false);
//   // // Can edit role
//   // expect(sites3.data.sites?.[0].blogs?.[0].can_edit_role).toBe(true);

//   // When admin looks up superadmin
//   const sites4 = await userCrud.getSites(siteUserId);
//   // superadmin rolename is removed
//   expect(
//     sites4.data.sites?.[0].blogs?.[0].rolenames?.includes("superadmin")
//   ).toBe(false);

//   await context.current.assumeUser(siteUserId);

//   // When superadmin looks up superadmin
//   const sites5 = await userCrud.getSites(siteUserId);
//   // superadmin is included in roleNames
//   expect(
//     sites5.data.sites?.[0].blogs?.[0].rolenames?.includes("superadmin")
//   ).toBe(true);

//   // expect(sites5.data.sites?.[0].blogs?.[0].can_edit_role).toBe(true);

//   // When user has no role
//   await context.current.assumeUser(secondUserId);
//   const sites6 = await userCrud.getSites(thirdUserId);

//   expect(sites6.data.primary_blog).toBe(undefined);

//   // Users without any assigned roles accessing other people's sites
//   await context.current.assumeUser(thirdUserId);
//   let ok = false;
//   try {
//     // throws error as user has no primary blog
//     await userCrud.getSites(secondUserId);
//   } catch (e) {
//     ok = true;
//   }
//   expect(ok).toBe(true);

//   await helpers.dropDatabase(dbName);
// });

// test("getSites - single site", async () => {
//   const dbName = "wptest-user-get-sitescrud-test";
//   const testAppName = "user_get_sites_crud_test";

//   // Create a test database
//   await helpers.createDatabase(dbName);

//   Application.configs = {
//     ...helpers.getBaseAppConfig(),
//     ...helpers.getAppConfig({
//       appName: testAppName,
//       isMulti: false,
//       database: {
//         user: "root",
//         password: "root",
//         database: dbName,
//       },
//     }),
//   };

//   const context = await Application.getContext(testAppName);

//   const userTrx = context.components.get(UserTrx);
//   const installer = context.components.get(Installer);

//   const random = Math.floor(Math.random() * 100000);

//   const userName = "__user_get_sites__crud_test_";
//   const userEmail = `${userName}@example.com`;

//   await installer.install({
//     blogTitle: "__installer_blog__",
//     userName,
//     userEmail,
//     isPublic: true,
//   });

//   // Add users
//   const users = [];
//   for (let i = 0; i <= 1; i++) {
//     const userLogin = `user_get_sites_crud_list_${i}_${random}`;
//     users.push(
//       await userTrx.upsert({
//         user_email: `user_crud_list_${i}_${random}@test.com`,
//         user_pass: "123456",
//         user_login: userLogin,
//         role: i == 0 ? "administrator" : "author",
//       })
//     );
//   }

//   const firstUserId = users[0];
//   const secondUserId = users[1];

//   const userCrud = context.components.get(UserCrud);

//   // First user has one admin role in 1st site & 1st blog
//   await context.current.assumeUser(firstUserId);

//   const sites = await userCrud.getSites(secondUserId);
//   expect(sites.data.primary_blog?.blog_id).toBe(1);
//   //expect(sites.data.primary_blog?.can_edit).toBe(true);

//   await context.current.assumeUser(secondUserId);
//   const sites2 = await userCrud.getSites(firstUserId);
//   expect(sites2.data.primary_blog).toBe(undefined);
//   expect(sites2.data.sites).toBe(undefined);

//   await helpers.dropDatabase(dbName);
// });
