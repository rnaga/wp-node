import Application from "@rnaga/wp-node/application";
import { TermCrud } from "@rnaga/wp-node/crud/term.crud";
import { getTestUsers } from "../../../helpers";

test("update", async () => {
  const context = await Application.getContext("single");
  const termCrud = context.components.get(TermCrud);

  const { admin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(admin);

  const newTermName = `__test_crud_term_update_${Math.floor(
    Math.random() * 10000
  )}`;
  const term = await termCrud.create({
    name: newTermName,
    taxonomyName: "post_tag",
  });

  // Subcriber can't update term
  await context.current.assumeUser(subscriber);

  await expect(
    termCrud.update(term.data.term_id, "post_tag", {
      name: "newname",
    })
  ).rejects.toThrow();

  await context.current.assumeUser(admin);

  await termCrud.update(term.data.term_id, "post_tag", {
    name: `${newTermName}_updated`,
  });

  const updatedTerm = await termCrud.get(term.data.term_id);
  expect(updatedTerm.data.name).toBe(`${newTermName}_updated`);
});
