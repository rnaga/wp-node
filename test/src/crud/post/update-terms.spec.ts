import Application from "@rnaga/wp-node/application";
import { PostCrud } from "@rnaga/wp-node/crud/post.crud";
import * as val from "@rnaga/wp-node/validators";
import { getTestUsers } from "../../../helpers";

test("update terms", async () => {
  const context = await Application.getContext("single");
  const postCrud = context.components.get(PostCrud);

  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const result = await postCrud.create({
    post_title: "test update terms",
    post_name: "test",
    post_type: "post",
    post_author: admin.props?.ID ?? 0,
  });

  const post = (await postCrud.get(result.data)).data;
  const postId = post.ID!;
  expect(postId > 0).toBe(true);

  // Get some categories
  const categories = await context.utils.crud.term.list("category", {
    per_page: 2,
  });
  expect(categories.data.length).toBe(2);

  const categoryIds = categories.data.map((cat) => cat.term_id);

  // Update post with categories
  await postCrud.update(postId, {
    post_category: categoryIds,
  });

  // Fetch post and verify categories
  const updatedPost = (await postCrud.get(postId)).data;
  const updatedCategoryIds = updatedPost.categories.map((cat) => cat.term_id);
  expect(updatedCategoryIds).toEqual(categoryIds);
});
