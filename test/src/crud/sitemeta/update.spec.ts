import Application from "@rnaga/wp-node/application";
import { SitemetaCrud } from "@rnaga/wp-node/crud/sitemeta.crud";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("multi");
  const sitemetaCrud = context.components.get(SitemetaCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const sitemeta = await sitemetaCrud.get(1);

  const firstComment = "____comment_____";
  await sitemetaCrud.update(1, {
    first_comment: firstComment,
  });

  const updated = await sitemetaCrud.get(1);
  expect(updated.data.first_comment).toBe(firstComment);

  await sitemetaCrud.update(1, {
    first_comment: sitemeta.data.first_comment,
  });
});
