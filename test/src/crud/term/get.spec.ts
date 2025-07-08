import Application from "@rnaga/wp-node/application";
import { TermCrud } from "@rnaga/wp-node/crud/term.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("single");
  const termCrud = context.components.get(TermCrud);

  const { admin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const term = await termCrud.get(1, { context: "edit" });
  expect(term.data.term_id).toBe(1);
  expect(typeof term.data.metas == "object").toBe(true);

  await context.current.assumeUser(subscriber);

  await expect(termCrud.get(1, { context: "edit" })).rejects.toThrow();

  const term2 = await termCrud.get(1);
  expect(term2.data.term_id).toBe(1);
});
