import Application from "@rnaga/wp-node/application";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { SignupTrx } from "@rnaga/wp-node/transactions";

test("upsert", async () => {
  const context = await Application.getContext("multi");
  const queryUtil = context.components.get(QueryUtil);
  const signupTrx = context.components.get(SignupTrx);

  const random = Math.floor(Math.random() * 1000);
  const userLoginBlog = `__blog_activate_${random}`;
  const domain = `test-activate-${random}.com`;
  const emailBlog = `blog-signup-${random}@test.com`;

  // Signup for new blog
  let singupId = await signupTrx.insert({
    type: "blog",
    domain: domain,
    title: "__title__",
    user: userLoginBlog,
    user_email: emailBlog,
    path: "/",
    meta: { key1: 1, key2: "value" },
  });

  let signups = await queryUtil.common("signups", (query) => {
    query.where("signup_id", singupId);
  });

  let result = await signupTrx.activate((signups as any)[0].activation_key);

  let user = await context.components.get(UserUtil).get(result.user_id);

  expect(user.props?.user_login).toBe(userLoginBlog);

  const blog = await context.components
    .get(BlogUtil)
    .get(result.blog_id as number);
  expect(blog.props?.domain).toBe(domain);

  const userLoginUser = `__user_activate_${random}`;
  const emailUser = `user-signup-${random}@test.com`;

  // Signup for a new user
  singupId = await signupTrx.insert({
    type: "user",
    user: userLoginUser,
    user_email: emailUser,
  });

  signups = await queryUtil.common("signups", (query) => {
    query.where("signup_id", singupId);
  });

  result = await signupTrx.activate((signups as any)[0].activation_key);
  user = await context.components.get(UserUtil).get(result.user_id);

  expect(user.props?.user_login).toBe(userLoginUser);
});
