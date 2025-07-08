import Application from "@rnaga/wp-node/application";
import { Options } from "@rnaga/wp-node/core/options";

import type * as types from "@rnaga/wp-node/types";

test("get an option", async () => {
  const context = await Application.getContext("single");

  const options = context.components.get(Options);

  const value = await options.get<types.Roles>("user_roles", {
    withPrefix: true,
  });

  expect(Object.keys(value ?? {}).includes("administrator")).toBe(true);

  // default
  const value2 = await options.get<string[]>("__invalid__", {
    default: ["default"],
  });

  expect(value2).toEqual(["default"]);
});

test("get an option in multi site", async () => {
  const context = await Application.getContext("multi");
  await context.current.switchSite(1, 1);

  const options = context.components.get(Options);

  const value = await options.get("site_name", {
    siteId: context.current.site?.props.site.id,
  });

  expect(value).toBe("wptest-multi Sites");
});

test("get multiple options", async () => {
  const context = await Application.getContext("multi");
  await context.current.switchSite(1, 1);

  const options = context.components.get(Options);

  let record = await options.get(["blogname", "siteurl"]);

  expect(record.size).toBe(2);

  record = await options.get(["site_name", "admin_email"], {
    siteId: context.current.site?.props.site.id,
  });

  expect(record.size).toBe(2);
});
