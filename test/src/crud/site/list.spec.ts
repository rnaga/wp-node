import Application from "@rnaga/wp-node/application";
import { SiteCrud } from "@rnaga/wp-node/crud/site.crud";
import { getTestUsers } from "../../../helpers";

test("list", async () => {
  const context = await Application.getContext("multi");
  const siteCrud = context.components.get(SiteCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const sites = await siteCrud.list({
    search: "localhost",
    include: [1],
  });

  expect(sites.data.length > 0).toBe(true);
});
