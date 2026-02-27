import Application from "@rnaga/wp-node/application";
import { TermCrud } from "@rnaga/wp-node/crud/term.crud";
import { getTestUsers } from "../../../helpers";

test("list", async () => {
  const context = await Application.getContext("single");
  const termCrud = context.components.get(TermCrud);

  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const terms = await termCrud.list("category", undefined, { context: "edit" });
  expect(terms.data.length > 0).toBe(true);

  const termsSortByTermOrder = await termCrud.list(
    "category",
    {
      post: 1,
      slug: ["uncategorized", "news"],
      orderby: "term_order",
      order: "asc",
    },
    {
      context: "edit",
    }
  );

  expect(termsSortByTermOrder.data.length > 0).toBe(true);
});
