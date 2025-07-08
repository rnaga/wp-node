import Application from "../../packages/core/src/application";
import { Site } from "../../packages/core/src/core/site";

test("get a site", async () => {
  const context = await Application.getContext("multi");

  const site = await context.components.asyncGet(Site, [1]);
  expect(site.props.site.id).toBe(1);
});
