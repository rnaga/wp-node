import * as defaults from "@rnaga/wp-node/defaults";

test("post status", () => {
  expect(defaults.postStatuses).toEqual([
    "publish",
    "future",
    "draft",
    "pending",
    "private",
    "trash",
    "inherit",
    "auto-draft",
    "request-pending",
    "request-confirmed",
    "request-failed",
    "request-completed",
  ]);
});
