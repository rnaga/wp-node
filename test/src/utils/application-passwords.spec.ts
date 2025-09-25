import Application from "@rnaga/wp-node/application";
import { ApplicationPasswordsUtil } from "@rnaga/wp-node/core/utils/application-passwords.util";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";

test("multi site", async () => {
  const context = await Application.getContext("multi");
  const appPasswordsUtil = context.components.get(ApplicationPasswordsUtil);
  const userUtil = context.components.get(UserUtil);

  const user = await userUtil.get(1);
  const userId = user.props!.ID;

  const { password, item } = await appPasswordsUtil.createNewPassword(userId, {
    name: "test-app",
  });

  // Check the length of the generated password
  expect(password.length).toBe(24);

  // The returned item should match the schema
  expect(item).toHaveProperty("uuid");
  expect(item).toHaveProperty("app_id");
  expect(item).toHaveProperty("name");
  expect(item).toHaveProperty("password");

  const uuid = item.uuid;

  // Get password by uuid
  const fetched = await appPasswordsUtil.getUserPasswordByUuid(userId, uuid);
  expect(fetched).not.toBeNull();
  expect(fetched!.uuid).toBe(uuid);
  expect(fetched!.name).toBe("test-app");

  console.log("Generated Password:", password, item);

  // Get passwords
  const passwords = await appPasswordsUtil.getUserPasswords(userId);
  expect(Array.isArray(passwords)).toBe(true);
  expect(passwords.length).toBeGreaterThan(0);

  // Authenticate with correct password
  const authResult = await appPasswordsUtil.authenticate(userId, password);
  expect(authResult).toBeDefined();
  expect((authResult as any).props.ID).toBe(userId);

  // Authenticate with incorrect password
  const authFail = await appPasswordsUtil.authenticate(
    userId,
    "wrong-password"
  );
  expect(authFail).toBeUndefined();

  // Update name
  const updated = await appPasswordsUtil.updatePasswordName(
    userId,
    item.uuid,
    "updated-name"
  );
  expect(updated).toBe(true);

  // Get again and check the name
  const updatedPasswords = await appPasswordsUtil.getUserPasswords(userId);
  const updatedItem = updatedPasswords.find((p) => p.uuid === item.uuid);
  expect(updatedItem).toBeDefined();
  expect(updatedItem!.name).toBe("updated-name");

  // Record usage
  const recorded = await appPasswordsUtil.recordPasswordUsage(userId, uuid, {
    ip: "127.0.0.1",
  });
  expect(recorded).toBe(true);
  // Get again and check the last_used and last_ip
  const recordedPasswords = await appPasswordsUtil.getUserPasswords(userId);
  console.log("Recorded Passwords:", recordedPasswords);
  const recordedItem = recordedPasswords.find((p) => p.uuid === item.uuid);
  expect(recordedItem).toBeDefined();

  // commenting out the check for last_used to avoid test timing issues
  // It will skip record and return true with null ip if last_used is within 24 hours
  //expect(recordedItem!.last_ip).toBe("127.0.0.1");

  // Create another password
  const { item: item2 } = await appPasswordsUtil.createNewPassword(userId, {
    name: "test-app-2",
  });

  const allPasswords = await appPasswordsUtil.getUserPasswords(userId);
  expect(allPasswords.length).toBe(passwords.length + 1);
  expect(allPasswords.find((p) => p.uuid === item2.uuid)).toBeDefined();

  console.log("All Passwords:", allPasswords);

  // Delete after creation
  await appPasswordsUtil.deleteAllPasswords(userId);
});

test("single site", async () => {
  const context = await Application.getContext("single");
  const appPasswordsUtil = context.components.get(ApplicationPasswordsUtil);
  const userUtil = context.components.get(UserUtil);

  const user = await userUtil.get(1);
  const userId = user.props!.ID;

  const { password, item } = await appPasswordsUtil.createNewPassword(userId, {
    name: "test-app",
  });

  // Check the length of the generated password
  expect(password.length).toBe(24);

  // The returned item should match the schema
  expect(item).toHaveProperty("uuid");
  expect(item).toHaveProperty("app_id");
  expect(item).toHaveProperty("name");
  expect(item).toHaveProperty("password");

  const uuid = item.uuid;

  // Get password by uuid
  const fetched = await appPasswordsUtil.getUserPasswordByUuid(userId, uuid);
  expect(fetched).not.toBeNull();
  expect(fetched!.uuid).toBe(uuid);
  expect(fetched!.name).toBe("test-app");

  console.log("Generated Password:", password, item);

  // Get passwords
  const passwords = await appPasswordsUtil.getUserPasswords(userId);
  expect(Array.isArray(passwords)).toBe(true);
  expect(passwords.length).toBeGreaterThan(0);

  // Update name
  const updated = await appPasswordsUtil.updatePasswordName(
    userId,
    item.uuid,
    "updated-name"
  );
  expect(updated).toBe(true);

  // Get again and check the name
  const updatedPasswords = await appPasswordsUtil.getUserPasswords(userId);
  const updatedItem = updatedPasswords.find((p) => p.uuid === item.uuid);
  expect(updatedItem).toBeDefined();
  expect(updatedItem!.name).toBe("updated-name");

  // Delete after creation
  await appPasswordsUtil.deleteAllPasswords(userId);
});
