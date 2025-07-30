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

test("checkPassword with known WordPress hash", () => {
  // Test with a properly created WordPress 6.8+ style hash
  const bcrypt = require("bcryptjs");
  const crypto = require("crypto");
  const password = "wp";

  // WordPress 6.8+ preprocessing: HMAC-SHA384 the password before bcrypt
  const passwordToVerify = crypto
    .createHmac("sha384", "wp-sha384")
    .update(password)
    .digest("base64");

  // Create bcrypt hash of the HMAC-processed password
  const validHash = bcrypt
    .hashSync(passwordToVerify, 10)
    .replace("$2b$", "$2y$");
  const wpStyleHash = `$wp${validHash}`; // WordPress prefix + bcrypt hash

  const result = checkPassword(password, wpStyleHash);
  expect(result).toBe(true);
});

test("checkPassword with actual database hash", () => {
  // Test with the actual hash from your WordPress database
  const password = "wp";
  const databaseHash =
    "$wp$2y$10$WLfs9dC4gT9SDud/lNl.cePR.afwHqedp87wHMrMa6.Lyqf5zmZQa";

  const result = checkPassword(password, databaseHash);
  expect(result).toBe(true);
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
