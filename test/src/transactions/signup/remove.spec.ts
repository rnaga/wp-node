import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { SignupTrx } from "@rnaga/wp-node/transactions/signup.trx";

test("remove", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);
  const signupTrx = context.components.get(SignupTrx);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `__blog_signup_remove_${random}`;
  const userEmail = `blog-signup_remove_${random}@test.com`;

  const singupId = await signupTrx.insert({
    type: "blog",
    domain: "test.com",
    title: "__title__",
    user: userLogin,
    user_email: userEmail,
    path: "/test/blog",
  });

  let signups = await queryUtil.common("signups", (query) => {
    query.where("signup_id", singupId);
  });

  // Throws error if registration date is too early
  await expect(signupTrx.remove(userLogin, { days: 2 })).rejects.toThrow();

  await signupTrx.remove(userLogin);

  signups = await queryUtil.common("signups", (query) => {
    query.where("signup_id", singupId);
  });

  expect(signups).toBe(undefined);
});
