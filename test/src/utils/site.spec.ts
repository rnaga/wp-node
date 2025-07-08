import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { SiteUtil } from "@rnaga/wp-node/core/utils/site.util";
import { MetaTrx } from "@rnaga/wp-node/transactions";

test("getBlogs", async () => {
  const context = await Application.getContext("multi");
  const siteUtil = context.components.get(SiteUtil);

  const blogs = await siteUtil.getBlogs(1);

  expect(blogs.length > 0).toBe(true);
  const name = await blogs[0]?.name();

  expect(typeof name).toBe("string");
  expect((blogs[0] as any).props.site_id).toBe(1);
});

test("getyReservedNames", async () => {
  const context = await Application.getContext("multi");
  const siteUtil = context.components.get(SiteUtil);

  const reservedNames = await siteUtil.getReservedNames();
  expect(reservedNames).toContain("www");
});

test("isEmailUnsafe", async () => {
  const context = await Application.getContext("multi");
  const siteUtil = context.components.get(SiteUtil);
  const metaTrx = context.components.get(MetaTrx);
  const current = context.components.get(Current);

  const siteId = current.siteId;

  await metaTrx.upsert(
    "site",
    siteId,
    "banned_email_domains",
    ["example.com", "example2.com"],
    {
      serialize: true,
    }
  );

  let result = await siteUtil.isEmailUnsafe("test@example.com");
  expect(result).toBe(true);

  result = await siteUtil.isEmailUnsafe("test@safedomain.com");
  expect(result).toBe(false);
});

test("isLimitedEmailDomains", async () => {
  const context = await Application.getContext("multi");
  const siteUtil = context.components.get(SiteUtil);
  const metaTrx = context.components.get(MetaTrx);
  const current = context.components.get(Current);

  const siteId = current.siteId;

  await metaTrx.upsert(
    "site",
    siteId,
    "limited_email_domains",
    ["example.com", "example2.com"],
    {
      serialize: true,
    }
  );

  const result1 = await siteUtil.isLimitedEmailDomains("test@example.com");
  const result2 = await siteUtil.isLimitedEmailDomains("test@safedomain.com");

  await metaTrx.remove("site", {
    objectId: siteId,
    key: "limited_email_domains",
  });

  expect(result1).toBe(true);
  expect(result2).toBe(false);
});
