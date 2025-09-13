import * as crypto from "crypto";
import * as sodium from "sodium-native";

// Constants for base64 variants (matching PHP sodium constants)
const SODIUM_BASE64_VARIANT_ORIGINAL = 1;
const SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING = 3;
const SODIUM_BASE64_VARIANT_URLSAFE = 5;
const SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING = 7;

export {
  SODIUM_BASE64_VARIANT_ORIGINAL,
  SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING,
  SODIUM_BASE64_VARIANT_URLSAFE,
  SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING,
};

/**
 * TypeScript equivalent of PHP's sodium_crypto_generichash()
 *
 * @param message - The message to hash
 * @param key - Optional key for keyed hashing
 * @param length - Output length in bytes (default: 32, min: 16, max: 64)
 * @returns Buffer containing the hash
 */
export const sodiumCryptoGenerichash = (
  message: string | Buffer,
  key?: string | Buffer | null,
  length: number = 32
): Buffer => {
  // Convert string inputs to Buffer
  const messageBuffer = Buffer.isBuffer(message)
    ? message
    : Buffer.from(message, "utf8");
  const keyBuffer = key
    ? Buffer.isBuffer(key)
      ? key
      : Buffer.from(key, "utf8")
    : null;

  // Validate length parameter
  if (length < 16 || length > 64) {
    throw new Error("Hash length must be between 16 and 64 bytes");
  }

  // Create output buffer
  const output = Buffer.alloc(length);

  // Compute hash using sodium-native
  if (keyBuffer) {
    sodium.crypto_generichash(output, messageBuffer, keyBuffer);
  } else {
    sodium.crypto_generichash(output, messageBuffer);
  }

  return output;
};

/**
 * TypeScript equivalent of PHP's sodium_bin2base64()
 * Encodes binary data to base64
 *
 * @param data - Binary data to encode
 * @param variant - Base64 variant (SODIUM_BASE64_VARIANT_ORIGINAL, SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING, SODIUM_BASE64_VARIANT_URLSAFE, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING)
 * @returns Base64 encoded string
 */
export const sodiumBin2Base64 = (
  data: string | Buffer,
  variant: number = SODIUM_BASE64_VARIANT_ORIGINAL
): string => {
  const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "binary");

  switch (variant) {
    case SODIUM_BASE64_VARIANT_ORIGINAL:
      return dataBuffer.toString("base64");

    case SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING:
      return dataBuffer.toString("base64").replace(/=/g, "");

    case SODIUM_BASE64_VARIANT_URLSAFE:
      return dataBuffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

    case SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING:
      return dataBuffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    default:
      throw new Error("Invalid base64 variant");
  }
};

/**
 * Convert base64 string back to binary data
 * @param base64 - Base64 encoded string
 * @param variant - Base64 variant that was used for encoding
 * @returns Buffer containing the decoded binary data
 */
export const sodiumBase642bin = (
  base64: string,
  variant: number = SODIUM_BASE64_VARIANT_ORIGINAL
): Buffer => {
  let normalizedBase64 = base64;

  switch (variant) {
    case SODIUM_BASE64_VARIANT_ORIGINAL:
      // Standard base64 with padding (default)
      break;

    case SODIUM_BASE64_VARIANT_ORIGINAL_NO_PADDING:
      // Standard base64 without padding - add padding back
      while (normalizedBase64.length % 4 !== 0) {
        normalizedBase64 += "=";
      }
      break;

    case SODIUM_BASE64_VARIANT_URLSAFE:
      // URL-safe base64 with padding - convert back to standard
      normalizedBase64 = normalizedBase64.replace(/-/g, "+").replace(/_/g, "/");
      break;

    case SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING:
      // URL-safe base64 without padding - convert and add padding
      normalizedBase64 = normalizedBase64.replace(/-/g, "+").replace(/_/g, "/");
      while (normalizedBase64.length % 4 !== 0) {
        normalizedBase64 += "=";
      }
      break;

    default:
      throw new Error(`Invalid base64 variant: ${variant}`);
  }

  try {
    return Buffer.from(normalizedBase64, "base64");
  } catch (error) {
    throw new Error("Invalid base64 string");
  }
};

/**
 * TypeScript equivalent of PHP's hash_equals()
 * Timing-safe string comparison to prevent timing attacks
 *
 * @param known - Known string (expected value)
 * @param user - User-provided string to compare
 * @returns true if strings are equal, false otherwise
 */
export const hashEquals = (known: string, user: string): boolean => {
  // Convert to buffers for consistent comparison
  const knownBuffer = Buffer.from(known, "utf8");
  const userBuffer = Buffer.from(user, "utf8");

  // Use Node.js crypto.timingSafeEqual for constant-time comparison
  // First check if lengths are equal (this itself is constant time for same-length inputs)
  if (knownBuffer.length !== userBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(knownBuffer, userBuffer);
};
