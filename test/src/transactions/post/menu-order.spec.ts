import Application from '@rnaga/wp-node/application';
import { QueryUtil } from '@rnaga/wp-node/core/utils/query.util';
import { PostTrx } from '@rnaga/wp-node/transactions';

test("update-menu-order no reOrder", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order no reorder",
    post_name: `test-update-menu-order-no-reorder-${Math.floor(Math.random() * 10000)}`,
    menu_order: 5,
  });

  // reOrder=false should just update the field, no side effects
  await postTrx.updateMenuOrder(postId, 10, { reOrder: false });

  const posts = await queryUtil.posts(query => {
    query.where("ID", postId);
  });

  expect(posts![0].menu_order).toBe(10);
});

test("update-menu-order reOrder: insert new post into list", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  const postIds: number[] = [];

  // Create 3 posts with menu_order 1, 2, 3
  for (let i = 1; i <= 3; i++) {
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test update menu order insert ${i}`,
      post_name: `test-update-menu-order-insert-${i}-${Math.floor(Math.random() * 10000)}`,
      menu_order: i,
    });
    postIds.push(postId);
  }

  // Create a new post with menu_order 0 (not yet in the list)
  const newPostId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order insert new",
    post_name: `test-update-menu-order-insert-new-${Math.floor(Math.random() * 10000)}`,
    menu_order: 0,
  });

  // Insert the new post at position 2 — posts at 2 and 3 should shift to 3 and 4
  await postTrx.updateMenuOrder(newPostId, 2, { checkParent: false });

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", [...postIds, newPostId]);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[postIds[0]]).toBe(1); // was 1, unaffected
  expect(orderById[postIds[1]]).toBe(3); // was 2, shifted +1
  expect(orderById[postIds[2]]).toBe(4); // was 3, shifted +1
  expect(orderById[newPostId]).toBe(2);  // inserted at 2
});

test("update-menu-order reOrder: insert new post into vacant slot (no shift)", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  const postIds: number[] = [];

  // Use a dedicated parent to isolate collision checks from other DB data
  const parentId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order no-shift parent",
    post_name: `test-update-menu-order-no-shift-parent-${Math.floor(Math.random() * 10000)}`,
  });

  // Create 3 posts with menu_order 1, 3, 4 (slot 2 is vacant)
  for (const order of [1, 3, 4]) {
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test update menu order no-shift ${order}`,
      post_name: `test-update-menu-order-no-shift-${order}-${Math.floor(Math.random() * 10000)}`,
      post_parent: parentId,
      menu_order: order,
    });
    postIds.push(postId);
  }

  const newPostId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order no-shift new",
    post_name: `test-update-menu-order-no-shift-new-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    menu_order: 0,
  });

  // Insert into vacant slot 2 — no collision among siblings, so no shifting
  await postTrx.updateMenuOrder(newPostId, 2);

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", [...postIds, newPostId]);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[postIds[0]]).toBe(1);  // unaffected
  expect(orderById[postIds[1]]).toBe(3);  // unaffected (no collision, no shift)
  expect(orderById[postIds[2]]).toBe(4);  // unaffected
  expect(orderById[newPostId]).toBe(2);   // inserted into vacant slot
});

test("update-menu-order reOrder: move existing post forward", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  const postIds: number[] = [];

  // Create 4 posts with menu_order 1, 2, 3, 4
  for (let i = 1; i <= 4; i++) {
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test update menu order move forward ${i}`,
      post_name: `test-update-menu-order-move-fwd-${i}-${Math.floor(Math.random() * 10000)}`,
      menu_order: i,
    });
    postIds.push(postId);
  }

  // Move post at position 1 to position 3
  // step1 (forward): decrement 1 < x < 3 → post1: 2→1
  // step2 (collision at 3): increment >= 3 → post2: 3→4, post3: 4→5
  // step3: post0=3
  await postTrx.updateMenuOrder(postIds[0], 3, { checkParent: false });

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", postIds);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[postIds[0]]).toBe(3); // moved to 3
  expect(orderById[postIds[1]]).toBe(1); // was 2, decremented (filled gap left by post0)
  expect(orderById[postIds[2]]).toBe(4); // was 3, shifted up (collision at target)
  expect(orderById[postIds[3]]).toBe(5); // was 4, shifted up (collision at target)
});

test("update-menu-order reOrder: move existing post backward", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  const postIds: number[] = [];

  // Create 4 posts with menu_order 1, 2, 3, 4
  for (let i = 1; i <= 4; i++) {
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test update menu order move backward ${i}`,
      post_name: `test-update-menu-order-move-bwd-${i}-${Math.floor(Math.random() * 10000)}`,
      menu_order: i,
    });
    postIds.push(postId);
  }

  // Move post at position 4 to position 2
  // step1 (not forward, skipped)
  // step2 (collision at 2): increment >= 2 AND < 4 → post1: 2→3, post2: 3→4
  // step3: post3=2
  await postTrx.updateMenuOrder(postIds[3], 2, { checkParent: false });

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", postIds);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[postIds[0]]).toBe(1); // was 1, unaffected
  expect(orderById[postIds[1]]).toBe(3); // was 2, shifted +1 by step1
  expect(orderById[postIds[2]]).toBe(4); // was 3, shifted +1 by step1
  expect(orderById[postIds[3]]).toBe(2); // moved to 2
});

test("update-menu-order reOrder: add order 0 to [0,0,0,0] → [0,1,1,1,1]", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const parentId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order all-zero parent",
    post_name: `test-update-menu-order-all-zero-parent-${Math.floor(Math.random() * 10000)}`,
  });

  const postIds: number[] = [];
  for (let i = 0; i < 4; i++) {
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test update menu order all-zero ${i}`,
      post_name: `test-update-menu-order-all-zero-${i}-${Math.floor(Math.random() * 10000)}`,
      post_parent: parentId,
      menu_order: 0,
    });
    postIds.push(postId);
  }

  const newPostId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order all-zero new",
    post_name: `test-update-menu-order-all-zero-new-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    menu_order: 0,
  });

  // collision at 0 → all existing posts shift to 1, new post placed at 0
  await postTrx.updateMenuOrder(newPostId, 0);

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", [...postIds, newPostId]);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[newPostId]).toBe(0);
  for (const id of postIds) {
    expect(orderById[id]).toBe(1); // all shifted from 0 to 1
  }
});

test("update-menu-order reOrder: add order 0 to [0,1,1,1] → [0,1,2,2,2]", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const parentId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order mixed-zero parent",
    post_name: `test-update-menu-order-mixed-zero-parent-${Math.floor(Math.random() * 10000)}`,
  });

  // Create posts with orders [0, 1, 1, 1]
  const orders = [0, 1, 1, 1];
  const postIds: number[] = [];
  for (let i = 0; i < orders.length; i++) {
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test update menu order mixed-zero ${i}`,
      post_name: `test-update-menu-order-mixed-zero-${i}-${Math.floor(Math.random() * 10000)}`,
      post_parent: parentId,
      menu_order: orders[i],
    });
    postIds.push(postId);
  }

  const newPostId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order mixed-zero new",
    post_name: `test-update-menu-order-mixed-zero-new-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    menu_order: 0,
  });

  // collision at 0 (postIds[0]) → all existing posts shift: 0→1, 1→2, 1→2, 1→2
  // then new post placed at 0
  await postTrx.updateMenuOrder(newPostId, 0);

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", [...postIds, newPostId]);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[newPostId]).toBe(0);
  expect(orderById[postIds[0]]).toBe(1); // was 0, shifted +1
  expect(orderById[postIds[1]]).toBe(2); // was 1, shifted +1
  expect(orderById[postIds[2]]).toBe(2); // was 1, shifted +1
  expect(orderById[postIds[3]]).toBe(2); // was 1, shifted +1
});

test("swap-menu-order all equal (0)", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  let postIds: number[] = [];

  // Create 3 posts all with menu order 0
  for (let i = 0; i < 3; i++) {
    const postName = `test-swap-menu-order-equal-${Math.floor(Math.random() * 10000)}`;
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test title swap menu order equal ${i}`,
      post_name: postName,
      menu_order: 0,
    });

    postIds.push(postId);
  }

  // Swap first and second post (both have menu_order 0)
  await postTrx.swapMenuOrder(postIds[0], postIds[1]);

  // Get the posts and check menu order
  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", postIds);
  });

  // When equal (reOrderOnEqual=true by default):
  // - first post: stays at 0 (gets post2's old order)
  // - second post: bumped to 1
  // - third post: also bumped to 1 (had menu_order >= 0, same parent, not post1/post2)
  for (const post of posts!) {
    if (post.ID === postIds[0]) {
      expect(post.menu_order).toBe(0);
    } else if (post.ID === postIds[1]) {
      expect(post.menu_order).toBe(1);
    } else if (post.ID === postIds[2]) {
      expect(post.menu_order).toBe(1);
    }
  }
});

test("swap-menu-order different order", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  let postIds: number[] = [];

  // Create 3 posts with menu order 0, 1, 2
  for (let i = 0; i < 3; i++) {
    const postName = `test-swap-menu-order-${Math.floor(Math.random() * 10000)}`;
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test title swap menu order ${i}`,
      post_name: postName,
      menu_order: i,
    });

    postIds.push(postId);
  }

  // Swap first and second post (smaller menu_order first — args order should not matter)
  const result = await postTrx.swapMenuOrder(postIds[0], postIds[1]);

  // Get the posts and check menu order
  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", postIds);
  });

  // - first post: 1
  // - second post: 0
  // - third post: 2 (unchanged)
  for (const post of posts!) {
    if (post.ID === postIds[0]) {
      expect(post.menu_order).toBe(1);
    } else if (post.ID === postIds[1]) {
      expect(post.menu_order).toBe(0);
    } else if (post.ID === postIds[2]) {
      expect(post.menu_order).toBe(2);
    }
  }
});

test("update-menu-order postTypes: shifts posts of specified types only", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const parentId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order postTypes parent",
    post_name: `test-update-menu-order-posttypes-parent-${Math.floor(Math.random() * 10000)}`,
  });

  // Create a "post" and a "page" both at menu_order 2, under the same parent
  const postTypePostId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order postTypes post",
    post_name: `test-update-menu-order-posttypes-post-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "post",
    menu_order: 2,
  });

  const postTypePageId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order postTypes page",
    post_name: `test-update-menu-order-posttypes-page-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "page",
    menu_order: 2,
  });

  // Insert a new "post" at menu_order 2 with postTypes: ["post", "page"]
  // Both the existing "post" and "page" at order 2 should shift to 3
  const newPostId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order postTypes new",
    post_name: `test-update-menu-order-posttypes-new-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "post",
    menu_order: 0,
  });

  await postTrx.updateMenuOrder(newPostId, 2, { postTypes: ["post", "page"] });

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", [postTypePostId, postTypePageId, newPostId]);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[newPostId]).toBe(2);        // inserted at 2
  expect(orderById[postTypePostId]).toBe(3);   // was 2, shifted (same type as new post)
  expect(orderById[postTypePageId]).toBe(3);   // was 2, shifted (included via postTypes)
});

test("update-menu-order postTypes: throws if post type not in postTypes", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "test update menu order invalid postType",
    post_name: `test-update-menu-order-invalid-posttype-${Math.floor(Math.random() * 10000)}`,
    post_type: "post",
    menu_order: 1,
  });

  // "page" does not include the post's actual type "post" → should throw
  await expect(
    postTrx.updateMenuOrder(postId, 2, { postTypes: ["page"] })
  ).rejects.toThrow();
});

test("swap-menu-order postTypes: equal order reOrder shifts posts of specified types", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const parentId = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order postTypes parent",
    post_name: `test-swap-menu-order-posttypes-parent-${Math.floor(Math.random() * 10000)}`,
  });

  // Create two "post" posts and one "page" all at menu_order 0 under the same parent
  const postId1 = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order postTypes post1",
    post_name: `test-swap-menu-order-posttypes-post1-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "post",
    menu_order: 0,
  });

  const postId2 = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order postTypes post2",
    post_name: `test-swap-menu-order-posttypes-post2-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "post",
    menu_order: 0,
  });

  const pageId = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order postTypes page",
    post_name: `test-swap-menu-order-posttypes-page-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "page",
    menu_order: 0,
  });

  // Swap two equal-order "post" posts with postTypes: ["post", "page"]
  // reOrderOnEqual=true (default): post1 stays at 0; post2 and the "page" sibling (both >= 0, not post1) shift to 1
  await postTrx.swapMenuOrder(postId1, postId2, { postTypes: ["post", "page"] });

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", [postId1, postId2, pageId]);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[postId1]).toBe(0); // stays at 0
  expect(orderById[postId2]).toBe(1); // bumped to 1
  expect(orderById[pageId]).toBe(1);  // also bumped — included via postTypes
});

test("swap-menu-order postTypes: swap posts of different types", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const parentId = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order diff-types parent",
    post_name: `test-swap-menu-order-diff-types-parent-${Math.floor(Math.random() * 10000)}`,
  });

  // A "post" at order 1 and a "page" at order 2 — different types, different orders
  const postTypePostId = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order diff-types post",
    post_name: `test-swap-menu-order-diff-types-post-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "post",
    menu_order: 1,
  });

  const postTypePageId = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order diff-types page",
    post_name: `test-swap-menu-order-diff-types-page-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "page",
    menu_order: 2,
  });

  // Swapping posts of different types is allowed when both types are in postTypes
  await postTrx.swapMenuOrder(postTypePostId, postTypePageId, { postTypes: ["post", "page"] });

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", [postTypePostId, postTypePageId]);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[postTypePostId]).toBe(2); // was 1, swapped with page
  expect(orderById[postTypePageId]).toBe(1); // was 2, swapped with post
});

test("swap-menu-order postTypes: throws if post type not in postTypes", async () => {
  const context = await Application.getContext("single");
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const parentId = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order invalid postType parent",
    post_name: `test-swap-menu-order-invalid-posttype-parent-${Math.floor(Math.random() * 10000)}`,
  });

  const postId1 = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order invalid postType 1",
    post_name: `test-swap-menu-order-invalid-posttype-1-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "post",
    menu_order: 1,
  });

  const postId2 = await postTrx.upsert({
    post_author: 1,
    post_title: "test swap menu order invalid postType 2",
    post_name: `test-swap-menu-order-invalid-posttype-2-${Math.floor(Math.random() * 10000)}`,
    post_parent: parentId,
    post_type: "post",
    menu_order: 2,
  });

  // "page" does not include the posts' actual type "post" → should throw
  await expect(
    postTrx.swapMenuOrder(postId1, postId2, { postTypes: ["page"] })
  ).rejects.toThrow();
});

test("swap-menu-order different order (args reversed: larger menu_order first)", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);
  let postIds: number[] = [];

  // Create 3 posts with menu order 0, 1, 2
  for (let i = 0; i < 3; i++) {
    const postName = `test-swap-menu-order-reversed-${Math.floor(Math.random() * 10000)}`;
    const postId = await postTrx.upsert({
      post_author: 1,
      post_title: `test title swap menu order reversed ${i}`,
      post_name: postName,
      menu_order: i,
    });

    postIds.push(postId);
  }

  // Pass larger-order post as postId1 — internally swapped so result is identical
  await postTrx.swapMenuOrder(postIds[1], postIds[0]);

  const posts = await queryUtil.posts(query => {
    query.whereIn("ID", postIds);
  });

  const orderById = Object.fromEntries(posts!.map(p => [p.ID, p.menu_order]));

  expect(orderById[postIds[0]]).toBe(1); // was 0, swapped with postIds[1]
  expect(orderById[postIds[1]]).toBe(0); // was 1, swapped with postIds[0]
  expect(orderById[postIds[2]]).toBe(2); // unchanged
});
