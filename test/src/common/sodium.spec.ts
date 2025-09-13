import {
  sodiumCryptoGenerichash,
  sodiumBin2Base64,
  SODIUM_BASE64_VARIANT_ORIGINAL,
  SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING,
  SODIUM_BASE64_VARIANT_URLSAFE,
  SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
  sodiumBase642bin,
  hashEquals,
} from "@rnaga/wp-node/common/sodium";

test("sodium-crypto", () => {
  // Basic hashing
  const message = "Hello, World!";
  const hash1 = sodiumCryptoGenerichash(message);
  expect(Buffer.isBuffer(hash1)).toBe(true);
  expect(hash1.length).toBe(32);

  // Keyed hashing
  const key = Buffer.from("my-secret-key-1234567890123456", "utf8"); // 32 bytes
  const hash2 = sodiumCryptoGenerichash(message, key);
  expect(Buffer.isBuffer(hash2)).toBe(true);
  expect(hash2.length).toBe(32);
  expect(hash2.equals(hash1)).toBe(false); // Should differ from unkeyed hash

  // Custom length
  const hash3 = sodiumCryptoGenerichash(message, null, 16);
  expect(hash3.length).toBe(16);

  // Base64 encoding examples
  const binaryData = Buffer.from("Hello, World!", "utf8");

  // Standard base64 with padding
  const standardBase64 = sodiumBin2Base64(
    binaryData,
    SODIUM_BASE64_VARIANT_ORIGINAL
  );
  expect(typeof standardBase64).toBe("string");
  expect(standardBase64.endsWith("==")).toBe(true);

  // Standard base64 without padding
  const noPaddingBase64 = sodiumBin2Base64(
    binaryData,
    SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING
  );
  expect(typeof noPaddingBase64).toBe("string");
  expect(noPaddingBase64.endsWith("==")).toBe(false);

  // URL-safe base64 with padding
  const urlSafeBase64 = sodiumBin2Base64(
    binaryData,
    SODIUM_BASE64_VARIANT_URLSAFE
  );
  expect(typeof urlSafeBase64).toBe("string");
  // URL-safe base64 should only contain A-Z, a-z, 0-9, '-', '_', and '=' for padding
  expect(urlSafeBase64).toMatch(/^[A-Za-z0-9\-_]+=*$/);
  // Should end with padding
  expect(urlSafeBase64.endsWith("==")).toBe(true);

  // Should have same length as standard base64 (padding preserved)
  const unsafeBinary = Buffer.from([251, 239, 255, 254, 250, 252, 255, 255]);
  const unsafeStandardBase64 = sodiumBin2Base64(
    unsafeBinary,
    SODIUM_BASE64_VARIANT_ORIGINAL
  );

  // Should contain '+' and '/'
  expect(unsafeStandardBase64).toMatch(/[+/]/);

  const unsafeUrlSafeBase64 = sodiumBin2Base64(
    unsafeBinary,
    SODIUM_BASE64_VARIANT_URLSAFE
  );

  // Should NOT contain '+' or '/'; should contain '-' or '_'
  expect(unsafeUrlSafeBase64).not.toMatch(/[+/]/);
  expect(unsafeUrlSafeBase64).toMatch(/[-_]/);

  console.log("Unsafe Standard Base64:", unsafeStandardBase64);
  console.log("Unsafe URL-Safe Base64:", unsafeUrlSafeBase64);

  // FIXED: Should end with single padding '=' (not double '==')
  expect(unsafeUrlSafeBase64.endsWith("=")).toBe(true);

  // Additional verification that both have same length (padding preserved)
  expect(unsafeStandardBase64.length).toBe(unsafeUrlSafeBase64.length);

  // URL-safe base64 without padding
  const urlSafeNoPaddingBase64 = sodiumBin2Base64(
    binaryData,
    SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING
  );
  expect(typeof urlSafeNoPaddingBase64).toBe("string");
  expect(urlSafeNoPaddingBase64.endsWith("==")).toBe(false);

  // Decoding examples
  const decoded1 = sodiumBase642bin(
    standardBase64,
    SODIUM_BASE64_VARIANT_ORIGINAL
  );
  const decoded2 = sodiumBase642bin(
    noPaddingBase64,
    SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING
  );
  expect(decoded1.toString("utf8")).toBe("Hello, World!");
  expect(decoded2.toString("utf8")).toBe("Hello, World!");

  // Encode hash as base64
  const hashAsBase64 = sodiumBin2Base64(
    hash1,
    SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING
  );
  expect(typeof hashAsBase64).toBe("string");
  expect(hashAsBase64.length).toBeGreaterThan(0);

  // test hashEquals
  const hashedBase64_1 = sodiumBin2Base64(
    sodiumCryptoGenerichash("test-string"),
    SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING
  );
  const hashedBase64_2 = sodiumBin2Base64(
    sodiumCryptoGenerichash("test-string"),
    SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING
  );
  const hashedBase64_3 = sodiumBin2Base64(
    sodiumCryptoGenerichash("different-string"),
    SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING
  );

  expect(hashEquals(hashedBase64_1, hashedBase64_2)).toBe(true);
  expect(hashEquals(hashedBase64_1, hashedBase64_3)).toBe(false);
});
