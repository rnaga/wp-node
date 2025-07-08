import Application from "@rnaga/wp-node/application";
import { SiteCrud } from "@rnaga/wp-node/crud/site.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("multi");
  const siteCrud = context.components.get(SiteCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const site = await siteCrud.get(1);
  expect(site.data.id).toBe(1);
});
