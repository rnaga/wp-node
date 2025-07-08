import Application from "@rnaga/wp-node/application";
import { TermCrud } from "@rnaga/wp-node/crud/term.crud";
import { getTestUsers } from "../../../helpers";

test("taxonomies", async () => {
  const context = await Application.getContext("single");
  const termCrud = context.components.get(TermCrud);

  const { admin } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const taxonomies = await termCrud.taxonomies();

  expect(taxonomies.data.length > 0).toBe(true);
});
