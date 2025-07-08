import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { Tables } from "@rnaga/wp-node/core/tables";

test("multi site", async () => {
  const context = await Application.getContext("multi");
  const tables = context.components.get(Tables);

  expect(tables.get("users")).toBe("wp_users");
  expect(tables.get("custom")).toBe("wp_custom");

  tables.index = 2;
  expect(tables.get("options")).toBe("wp_2_options");
});

test("single site", async () => {
  const context = await Application.getContext("single");
  const tables = context.components.get(Tables);

  tables.index = 2;
  expect(tables.get("options")).toBe("wp_options");
});

test("with current", async () => {
  const context = await Application.getContext("multi");
  const current = context.components.get(Current);
  const tables = context.components.get(Tables);

  await current.switchBlog(2);
  expect(current.site?.props.blog.blog_id).toBe(2);

  await current.switchBlog(1);
  expect(current.site?.props.blog.blog_id).toBe(1);

  await current.switchBlog(3);
  expect(tables.prefix).toBe("wp_3_");

  tables.index = 10;
  expect(tables.prefix).toBe("wp_10_");
});
