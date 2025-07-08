// To execute this script, run:
// npx ts-node index.ts

import "./_wp/settings";
import Application from "@rnaga/wp-node/application";

// This script demonstrates how to fetch posts.
(async () => {
  // Initialize the application
  const context = await Application.getContext();

  // Fetch posts by running a query
  // This example fetches posts with ID 1
  const posts = await context.utils.query.posts((query) => {
    query.where("ID", 1);

    // Output query
    console.log(query.builder.toString());
  });

  // Log the fetched posts
  console.log(posts);
  process.exit(0);
})();
