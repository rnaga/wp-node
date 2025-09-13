import {
  cleanupPasswordHash,
  fastHash,
  generatePassword,
  phpUnserialize,
  uuid4,
  verifyFastHash,
} from "../../common";
import { Config } from "../../config";
import { component } from "../../decorators/component";
import { MetaTrx, OptionsTrx } from "../../transactions";
import { applicationPassword } from "../../validators/application-password";
import { Components } from "../components";
import { Options } from "../options";
import { MetaUtil } from "./meta.util";
import { SiteUtil } from "./site.util";
import { check, z } from "zod";
import { UserUtil } from "./user.util";

// Application Passwords should be 24 characters long.
// https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/#application-passwords
const PW_LENGTH = 24;

type ApplicationPassword = z.infer<typeof applicationPassword>;

@component()
export class ApplicationPasswordsUtil {
  constructor(private config: Config, private components: Components) {}

  getMetaKey() {
    return "_application_passwords";
  }

  getOptionsKey() {
    return "using_application_passwords";
  }

  isAvailable(checkSsl: boolean = true) {
    return (
      this.config.config.useApplicationPasswords === true &&
      (checkSsl === false || this.config.isSsl() === true)
    );
  }

  async isInUse() {
    const options = this.components.get(Options);
    const siteUtil = this.components.get(SiteUtil);
    const mainSiteId = await siteUtil.getMainSiteId();

    const using = !this.config.isMultiSite()
      ? await options.get(this.getOptionsKey())
      : await options.get(this.getOptionsKey(), { siteId: mainSiteId });

    return (
      using === "1" ||
      parseInt(`${using}`) === 1 ||
      Boolean(`${using}`) === true
    );
  }

  // create_new_application_password
  async createNewPassword(
    userId: number,
    options: {
      name: string;
      app_id?: string;
    }
  ) {
    const name = z.string().min(2).max(100).parse(options.name);
    const newPassword = generatePassword(PW_LENGTH, false);
    const hashedPassword = fastHash(newPassword);

    const newItem: ApplicationPassword = {
      uuid: uuid4(),
      app_id: options.app_id || "",
      name,
      password: hashedPassword,
      created: Math.floor(Date.now() / 1000),
      last_used: null,
      last_ip: null,
    };

    // Set Option Key
    if (this.config.isMultiSite()) {
      const siteId = await this.components.get(SiteUtil).getMainSiteId();
      const metaTrx = this.components.get(MetaTrx);
      await metaTrx.upsert("site", siteId, this.getOptionsKey(), "1");
    } else {
      const optionsTrx = this.components.get(OptionsTrx);
      await optionsTrx.insert(this.getOptionsKey(), "1", { upsert: true });
    }

    const passwords = await this.getUserPasswords(userId);
    passwords.push(newItem);

    const result = await this.setUserPasswords(userId, passwords);

    if (!result) {
      throw new Error("Failed to set user passwords");
    }

    return {
      password: newPassword,
      item: newItem,
    };
  }

  // record_application_password_usage
  async recordPasswordUsage(
    userId: number,
    uuid: string,
    options: { ip?: string | null }
  ) {
    const passwords = await this.getUserPasswords(userId);

    for (const password of passwords) {
      if (password.uuid !== uuid) {
        continue;
      }

      const lastUsed = password.last_used || 0;
      // Only record activity once a day.
      if (lastUsed > 0 && lastUsed + 86400 > Math.floor(Date.now() / 1000)) {
        return true;
      }

      // Update the password object in the array
      password.last_used = Math.floor(Date.now() / 1000);
      password.last_ip = options.ip || null;

      // Save the updated passwords array
      return await this.setUserPasswords(userId, passwords);
    }

    return false;
  }

  // update_application_password
  async updatePasswordName(userId: number, uuid: string, newName: string) {
    const name = z.string().min(2).max(100).parse(newName);
    const passwords = await this.getUserPasswords(userId);

    for (const password of passwords) {
      if (password.uuid !== uuid) {
        continue;
      }

      // Update the password object in the array
      password.name = name;

      // Save the updated passwords array
      return await this.setUserPasswords(userId, passwords);
    }

    return false;
  }

  // delete_application_password
  async deletePassword(userId: number, uuid: string) {
    const passwords = await this.getUserPasswords(userId);
    const filtered = passwords.filter((password) => password.uuid !== uuid);

    return await this.setUserPasswords(userId, filtered);
  }

  // delete_all_application_passwords
  async deleteAllPasswords(userId: number) {
    return await this.setUserPasswords(userId, []);
  }

  private parsePasswords(passwords: ApplicationPassword[]) {
    return z.array(applicationPassword).parse(passwords || []);
  }

  // get_user_application_password
  async getUserPasswords(userId: number) {
    const metaUtil = this.components.get(MetaUtil);
    const passwords = await metaUtil.getValue(
      "user",
      userId,
      this.getMetaKey()
    );

    // Unserialize
    const serialized: ApplicationPassword[] = phpUnserialize(passwords) || [];

    return this.parsePasswords(serialized);
  }

  // get_user_application_password
  async getUserPasswordByUuid(
    userId: number,
    uuid: string
  ): Promise<ApplicationPassword | null> {
    if (uuid.length !== 36) {
      return null;
    }

    const passwords = await this.getUserPasswords(userId);
    return passwords.find((password) => password.uuid === uuid) || null;
  }

  // set_user_application_passwords
  async setUserPasswords(userId: number, passwords: ApplicationPassword[]) {
    const parsed = this.parsePasswords(passwords);
    const metaTrx = this.components.get(MetaTrx);

    return await metaTrx.upsert("user", userId, this.getMetaKey(), parsed, {
      serialize: true,
    });
  }

  chunkPassword(password: string) {
    // Clean up first with cleanupPasswordHash
    const cleanedUp = cleanupPasswordHash(password);

    // trim( chunk_split( $raw_password, 4, ' ' ) );
    return (
      cleanedUp
        .match(/.{1,4}/g)
        ?.join(" ")
        .trim() || ""
    );
  }

  // wp_authenticate_application_password
  async authenticate(
    userIdOrName: number | string,
    rawPassword: string,
    options?: {
      ip?: string;
    }
  ) {
    if ((await this.isInUse()) === false) {
      return undefined;
    }

    // Get user
    const userUtil = this.components.get(UserUtil);
    const user = await userUtil.get(userIdOrName);
    if (!user.props) {
      return undefined;
    }

    const userId = user.props!.ID;
    const password = cleanupPasswordHash(rawPassword);
    if (password.length !== PW_LENGTH) {
      return undefined;
    }

    // Get all password objects
    const passwords = await this.getUserPasswords(userId);
    for (const item of passwords) {
      if (item.password && verifyFastHash(password, item.password)) {
        // Record usage
        await this.recordPasswordUsage(userId, item.uuid, {
          ip: options?.ip || null,
        });

        // Return user object
        return user;
      }
    }

    return undefined;
  }
}
