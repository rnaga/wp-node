import { DO_NOT_ALLOW } from "@rnaga/wp-node/constants";
import { User } from "@rnaga/wp-node/core/user";
import { runSite } from "./helpers";

declare module "@rnaga/wp-node/types" {
  interface MapMetaCapArgs {
    custom_cap: [];
  }
}

test("filter", async () => {
  const { users, cap, context } = await runSite("single");

  context.hooks.filter.add(
    "core_map_meta_cap",
    async (caps, context, action, user: User) => {
      if ("custom_cap" !== action) {
        return caps;
      }

      const role = await user.role();

      if (role.is("subscriber")) {
        return new Set([DO_NOT_ALLOW]);
      }

      return caps;
    }
  );

  let results = await cap.check("custom_cap_not_registered", users.subscriber);
  expect(results.includes(DO_NOT_ALLOW)).toBe(false);

  results = await cap.check("custom_cap", users.subscriber);
  expect(results.includes(DO_NOT_ALLOW)).toBe(true);

  results = await cap.check("custom_cap", users.editor);
  expect(results.includes(DO_NOT_ALLOW)).toBe(false);
});
