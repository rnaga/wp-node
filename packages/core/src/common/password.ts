import * as crypto from "crypto";

export const hashPassword = (plainText: string) => {
  const passwordHash = new PasswordHash(8, true);
  return passwordHash.hashPassword(plainText);
};

export const checkPassword = (plainText: string, storedHash: string) => {
  const passwordHash = new PasswordHash(8, true);
  return passwordHash.checkPassword(plainText, storedHash);
};

export const generatePassword = (
  length: number = 12,
  specialChars: boolean = true,
  extraSpecialChars: boolean = false
): string => {
  let chars: string =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  if (specialChars) {
    chars += "!@#$%^&*()";
  }

  if (extraSpecialChars) {
    chars += "-_ []{}<>~`+=,.;:/?|";
  }

  let password: string = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

const CRYPT_BLOWFISH = 1;

class PasswordHash {
  private itoa64: string;
  private iterationCountLog2: number;
  private portableHashes: boolean;
  private randomState: string;

  constructor(iterationCountLog2: number, portableHashes: boolean) {
    this.itoa64 =
      "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    if (iterationCountLog2 < 4 || iterationCountLog2 > 31) {
      iterationCountLog2 = 8;
    }
    this.iterationCountLog2 = iterationCountLog2;

    this.portableHashes = portableHashes;

    this.randomState = Date.now().toString();
    if (typeof process !== "undefined" && typeof process.pid !== "undefined") {
      this.randomState += process.pid.toString();
    }
  }

  getRandomBytes(count: number): string {
    let output = "";

    try {
      const randomBytes = crypto.randomBytes(count);
      output = randomBytes.toString("hex");
    } catch (err) {
      for (let i = 0; i < count; i += 16) {
        this.randomState = crypto
          .createHash("md5")
          .update(this.randomState + Math.random())
          .digest("binary");
        output += crypto
          .createHash("md5")
          .update(this.randomState, "binary")
          .digest("binary");
      }
      output = output.substring(0, count);
    }

    return output;
  }

  encode64(input: string, count: number): string {
    let output = "";
    let i = 0;
    do {
      let value = input.charCodeAt(i++);
      output += this.itoa64[value & 0x3f];
      if (i < count) {
        value |= input.charCodeAt(i) << 8;
      }
      output += this.itoa64[(value >> 6) & 0x3f];
      if (i++ >= count) {
        break;
      }
      if (i < count) {
        value |= input.charCodeAt(i) << 16;
      }
      output += this.itoa64[(value >> 12) & 0x3f];
      if (i++ >= count) {
        break;
      }
      output += this.itoa64[(value >> 18) & 0x3f];
    } while (i < count);

    return output;
  }

  genSaltPrivate(input: string): string {
    let output = "$P$";
    output +=
      this.itoa64[
        Math.min(
          this.iterationCountLog2 +
            (parseInt(process.versions.node, 10) >= 5 ? 5 : 3),
          30
        )
      ];
    output += this.encode64(input, 6);
    return output;
  }

  cryptPrivate(password: string, setting: string): string {
    let output = "*0";
    if (setting.substring(0, 2) === output) {
      output = "*1";
    }

    const id = setting.substring(0, 3);
    if (id !== "$P$" && id !== "$H$") {
      return output;
    }

    const countLog2 = this.itoa64.indexOf(setting[3]);
    if (countLog2 < 7 || countLog2 > 30) {
      return output;
    }

    let count = 1 << countLog2;
    const salt = setting.substring(4, 12);

    if (salt.length !== 8) {
      return output;
    }

    let hash = crypto
      .createHash("md5")
      .update(salt + password, "binary")
      .digest("binary");
    do {
      hash = crypto
        .createHash("md5")
        .update(hash + password, "binary")
        .digest("binary");
    } while (--count);

    output = setting.substring(0, 12) + this.encode64(hash, 16);
    return output;
  }

  genSaltBlowfish(input: string): string {
    const itoa64 =
      "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let output = "$2a$";
    output += String.fromCharCode(
      parseInt("0", 10) + Math.floor(this.iterationCountLog2 / 10)
    );
    output += String.fromCharCode(
      parseInt("0", 10) + (this.iterationCountLog2 % 10)
    );
    output += "$";

    let i = 0;
    do {
      const c1 = input.charCodeAt(i++);
      output += itoa64[c1 >> 2];
      const c2 = input.charCodeAt(i++);
      output += itoa64[((c1 & 0x03) << 4) | (c2 >> 4)];
      if (i >= 16) {
        output += itoa64[c2 & 0x0f];
        break;
      }

      const c3 = input.charCodeAt(i++);
      output += itoa64[((c2 & 0x0f) << 2) | (c3 >> 6)];
      output += itoa64[c3 & 0x3f];
      // eslint-disable-next-line no-constant-condition
    } while (true);

    return output;
  }

  hashPassword(password: string): string {
    if (password.length > 4096) {
      return "*";
    }

    let random = "";

    if (CRYPT_BLOWFISH === 1 && !this.portableHashes) {
      random = this.getRandomBytes(16);
      const hash = this.cryptPrivate(password, this.genSaltBlowfish(random));
      if (hash.length === 60) {
        return hash;
      }
    }

    if (random.length < 6) {
      random = this.getRandomBytes(6);
    }
    const hash = this.cryptPrivate(password, this.genSaltPrivate(random));
    if (hash.length === 34) {
      return hash;
    }

    return "*";
  }

  checkPassword(password: string, storedHash: string): boolean {
    if (password.length > 4096) {
      return false;
    }

    let hash = this.cryptPrivate(password, storedHash);
    if (hash[0] === "*") {
      hash = crypto
        .createHash("md5")
        .update(password, "binary")
        .digest("binary");
      hash = this.cryptPrivate(password, storedHash);
    }

    return hash === storedHash;
  }
}
