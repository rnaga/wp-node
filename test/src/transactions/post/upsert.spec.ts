import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { PostTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";

test("defaults", async () => {
  const defaults = val.trx.postUpsert.parse({});
  expect(defaults.comment_status).toBe("open");
});

test("with input", async () => {
  const input: Partial<z.infer<typeof val.trx.postUpsert>> = {
    post_author: 1,
    post_name: "test",
    post_categeory: [1, 2, 3],
  };

  const result = val.trx.postUpsert.parse(input);
  expect(result.post_name).toBe("test");
});

test("upsert", async () => {
  const context = await Application.getContext("single");
  const queryUtil = context.components.get(QueryUtil);
  await context.current.assumeUser(1);

  const postTrx = context.components.get(PostTrx);

  const postId = await postTrx.upsert({
    // ID: 345,
    post_author: 1,
    post_title: "test title",
    post_name: "test",
    post_type: "post",
    //post_categeory: categoryIds,
    //tags_input: ["tag1", "tag2", "tag3", "tag4"],
    tax_input: {
      custom: ["term1", "term2", "term3"],
    },
  });

  // Check if terms for custom taxonomy are created
  const terms = await queryUtil.terms((query) => {
    query.withObjectIds([postId]);
  });

  const taxonomyNames = terms?.map((term) => term.taxonomy) ?? [];
  expect(taxonomyNames).toContain("custom");
});

// test("transaction", async () => {
//   const context = await Application.getContext("single");
//   const database = context.components.get(Database);

//   const trx = await database.transaction;
//   await trx
//     .from("wp_posts")
//     .limit(1)
//     .then((v) => {
//       trx.commit();
//       expect(v[0].ID).toBe(1);
//     })
//     .catch(trx.rollback);
// });
