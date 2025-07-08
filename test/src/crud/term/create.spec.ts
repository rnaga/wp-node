import Application from "@rnaga/wp-node/application";
import { TermCrud } from "@rnaga/wp-node/crud/term.crud";
import { getTestUsers } from "../../../helpers";

test("create", async () => {
  const context = await Application.getContext("single");
  const termCrud = context.components.get(TermCrud);

  const { admin, subscriber } = await getTestUsers(context);

  await context.current.assumeUser(subscriber);

  // Subscriber can't create term
  await expect(
    termCrud.create({
      name: "new_term",
      taxonomyName: "category",
    })
  ).rejects.toThrow();

  await expect(
    termCrud.create({
      name: "new_term",
      taxonomyName: "post_tag",
    })
  ).rejects.toThrow();

  await context.current.assumeUser(admin);

  const newTermName = `__test_crud_term_create_${Math.floor(
    Math.random() * 10000
  )}`;
  const term = await termCrud.create({
    name: newTermName,
    taxonomyName: "post_tag",
  });

  expect(term.data.term_id > 0).toBe(true);

  const result = await termCrud.get(term.data.term_id, { context: "edit" });
  expect(result.data.name).toBe(newTermName);
});
