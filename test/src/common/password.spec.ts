import {
  hashPassword,
  checkPassword,
  generatePassword,
} from "@rnaga/wp-node/common/password";

test("built-in", async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const hasher = require("wordpress-hash-node");
  const plaintextPassword = "123456";

  const storedHash = hashPassword(plaintextPassword);
  console.log(`hash: ${storedHash}`);
  const result = checkPassword(plaintextPassword, storedHash);

  console.log(`checkPassword: ${result}`);
  console.log(
    `wordpress-hash-node.checkPassword: ${hasher.CheckPassword(
      plaintextPassword,
      storedHash
    )}`
  );
});

test("generatePassword", () => {
  const password = generatePassword(12);
  expect(password.length == 12).toBe(true);
});

test("wordpress-hash-node", async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const hasher = require("wordpress-hash-node");
  const password = "123456";
  const hash = hasher.HashPassword(password);
  const checked = hasher.CheckPassword(password, hash); //This will return true;

  console.log(`hash: ${hash} checkPassword: ${checked}`);
});
