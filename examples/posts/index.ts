// To execute this script, run:
// npx ts-node index.ts

import "./_wp/settings";

import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import * as vals from "@rnaga/wp-node/validators";

// This script demonstrates how to fetch posts.
(async () => {
  // Initialize the application
  const context = await Application.getContext();

  // Assign user ID to admin user
  await context.current.assumeUser(1);

  // Create a post
  const postId = await context.utils.trx.post.upsert({
    post_title: "Test Post",
    post_content: "This is a test post.",
    post_type: "post",
  });

  // Then get the post based on the ID
  const newPost = await context.utils.post.get(postId);
  console.log("Created Post:", newPost.props);

  // Fetch posts by running a query
  // This example fetches posts with ID 1
  const posts = await context.utils.query.posts(
    (query) => {
      query.where("post_type", "post");
      query.select(["ID", "post_title", "post_date"]);
      // Output query
      console.log(query.builder.toString());
    },

    // The second argument is a result validator.
    // Since we are selecting specific fields, we pick specific fields from the predefined schema.
    z.array(
      vals.query.postsResult.element.pick({
        ID: true,
        post_title: true,
        post_date: true,
      })
    )
  );

  // Log the fetched posts
  console.log(posts?.[0]);
  process.exit(0);
})();
