import Application from "@rnaga/wp-node/application";
import { TermCrud } from "@rnaga/wp-node/crud/term.crud";
import { getTestUsers } from "../../../helpers";

test("delete", async () => {
  const context = await Application.getContext("single");
  const termCrud = context.components.get(TermCrud);

  const { admin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const newTermName = `__test_crud_term_delete_${Math.floor(
    Math.random() * 10000
  )}`;
  const term = await termCrud.create({
    name: newTermName,
    taxonomyName: "post_tag",
  });

  // Subcriber can't delete term
  await context.current.assumeUser(subscriber);

  await expect(
    termCrud.delete(term.data.term_id, "post_tag")
  ).rejects.toThrow();

  await context.current.assumeUser(admin);

  await termCrud.delete(term.data.term_id, "post_tag");

  await expect(termCrud.get(term.data.term_id)).rejects.toThrow();
});
