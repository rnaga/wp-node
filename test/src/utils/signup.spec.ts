import Application from "@rnaga/wp-node/application";
import { SignupUtil } from "@rnaga/wp-node/core/utils/signup.util";
import { PostTrx, SignupTrx, UserTrx } from "@rnaga/wp-node/transactions";

test("validateUser", async () => {
  const context = await Application.getContext("multi");
  const signupUtil = context.components.get(SignupUtil);
  const userTrx = context.components.get(UserTrx);
  const signupTrx = context.components.get(SignupTrx);

  let result = await signupUtil.validateUser("USER", "email@test.com");
  expect(result[1]).toBe(
    "Usernames can only contain lowercase letters (a-z) and numbers"
  );

  result = await signupUtil.validateUser("usertest", "invalid");
  expect(result[1]).toBe("Invalid email address (unsafe or format)");

  result = await signupUtil.validateUser("root", "invalid");
  expect(result[1]).toBe("Username is not allowed (reserved)");

  // name / user_login is invalid
  result = await signupUtil.validateUser("a", "email@test.com");
  expect(result[1]).toMatch(/too_small/);

  const random = Math.floor(Math.random() * 100000);
  const userLogin = `uservalidate${random}`;
  const userEmail = `${userLogin}@test.com`;

  await userTrx.upsert({
    user_login: userLogin,
    user_email: userEmail,
  });

  result = await signupUtil.validateUser(userLogin, userEmail);
  expect(result[1]).toBe("User already exists");

  const userLoginSignup = `uservalidatesignup${random}`;
  const userEmailSignup = `${userLoginSignup}@test.com`;

  await signupTrx.insert({
    type: "user",
    user: userLoginSignup,
    user_email: userEmailSignup,
  });

  result = await signupUtil.validateUser(userLoginSignup, userEmailSignup);
  expect(result[1]).toBe("User already signed up");

  result = await signupUtil.validateUser(
    "validateuser",
    "validateuser@test.com"
  );
  expect(result[0]).toBe(true);

  await signupTrx.remove(userEmailSignup);
});

test("validateBlog", async () => {
  const context = await Application.getContext("multi");
  const signupUtil = context.components.get(SignupUtil);
  const postTrx = context.components.get(PostTrx);
  const userTrx = context.components.get(UserTrx);

  let result = await signupUtil.validateBlog("NAME", "title");
  expect(result[1]).toBe("Invalid blogname (numbers and lowercase letters)");

  result = await signupUtil.validateBlog("root", "title");
  expect(result[1]).toBe("Invalid blogname (reserved or length)");

  context.config.config.multisite.subdomainInstall = false;

  const random = Math.floor(Math.random() * 100000);
  const postName = `validateblog${random}`;

  await postTrx.upsert({
    post_author: 1,
    post_name: postName,
    post_title: postName,
    post_type: "page",
  });

  result = await signupUtil.validateBlog(postName, "title");
  expect(result[1]).toBe("Invalid blogname (site name)");

  result = await signupUtil.validateBlog("12345", "title");
  expect(result[1]).toBe("Invalid name (numbers only)");

  result = await signupUtil.validateBlog("validateblog", "\\\\");
  expect(result[1]).toBe("Invalid title");

  const userLogin = `blogrvalidate${random}`;
  const userEmail = `${userLogin}@test.com`;

  await userTrx.upsert({
    user_login: userLogin,
    user_email: userEmail,
  });

  result = await signupUtil.validateBlog(userLogin, "title");
  expect(result[1]).toBe("Invalid name (user_login)");

  result = await signupUtil.validateBlog("validateblog", "title");
  expect(result[0]).toBe(true);
});
