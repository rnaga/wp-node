import Application from "@rnaga/wp-node/application";
import { SitemetaCrud } from "@rnaga/wp-node/crud/sitemeta.crud";
import { getTestUsers } from "../../../helpers";

test("get", async () => {
  const context = await Application.getContext("multi");
  const sitemetaCrud = context.components.get(SitemetaCrud);
  const { superAdmin } = await getTestUsers(context);

  await context.current.assumeUser(superAdmin);

  const sitemeta = await sitemetaCrud.get(1);
  expect(sitemeta.data.admin_email).not.toBe(undefined);
});
