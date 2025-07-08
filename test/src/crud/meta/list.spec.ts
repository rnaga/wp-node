import Application from "@rnaga/wp-node/application";
import { MetaCrud } from "@rnaga/wp-node/crud/meta.crud";
import { getTestUsers } from "../../../helpers";

test("list", async () => {
  const context = await Application.getContext("multi");

  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);
  const metaCrud = context.components.get(MetaCrud);

  const metas = await metaCrud.list("post", {
    include: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    exclude: [2],
    search: "a",
  });

  expect(metas.data.length).toBeGreaterThan(0);
});
