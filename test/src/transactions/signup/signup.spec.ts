import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { SignupTrx } from "@rnaga/wp-node/transactions/signup.trx";

test("upsert", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);
  const signupTrx = context.components.get(SignupTrx);

  let singupId = await signupTrx.insert({
    type: "blog",
    domain: "test.com",
    title: "__title__",
    user: `__blog_signup_${Math.floor(Math.random() * 1000)}`,
    user_email: "blog-signup@test.com",
    path: "/test/blog",
    meta: { key1: 1, key2: "value" },
  });

  let signups = await queryUtil.common("signups", (query) => {
    query.where("signup_id", singupId);
  });

  expect((signups as any)[0].user_email).toBe("blog-signup@test.com");

  singupId = await signupTrx.insert({
    type: "user",
    user: `__user_signup_${Math.floor(Math.random() * 1000)}`,
    user_email: "user-signup@test.com",
    meta: { key3: 3, key4: "value" },
  });

  signups = await queryUtil.common("signups", (query) => {
    query.where("signup_id", singupId);
  });

  expect((signups as any)[0].user_email).toBe("user-signup@test.com");
});
