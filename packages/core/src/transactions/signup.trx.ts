import * as crypto from "crypto";
import { z } from "zod";

import { formatting, generatePassword, phpSerialize } from "../common";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Logger } from "../core/logger";
import { QueryUtil } from "../core/utils/query.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { BlogTrx } from "./blog.trx";
import { MetaTrx } from "./meta.trx";
import { Trx } from "./trx";
import { UserTrx } from "./user.trx";

type Input =
  | {
      type: "blog";
      domain: string;
      path: string;
      title: string;
      user: string;
      user_email: string;
      meta?: Record<string, any>;
    }
  | {
      type: "user";
      user: string;
      user_email: string;
      meta?: Record<string, any>;
    };

type DataInsert = z.infer<typeof val.trx.signupInsert>;

@transactions()
export class SignupTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private blogTrx: BlogTrx,
    private userTrx: UserTrx,
    private validator: Validator
  ) {
    super(components);
  }

  private generateKey(value: string) {
    const currentTime: number = Math.floor(Date.now() / 1000); // Get current time in seconds
    const randomValue: number = Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER
    ); // Generate a random number

    const inputString: string =
      currentTime.toString() + randomValue.toString() + value;

    // Calculate the MD5 hash
    const md5Hash: string = crypto
      .createHash("md5")
      .update(inputString)
      .digest("hex");

    // Take the first 16 characters of the MD5 hash as the key
    const key: string = md5Hash.substring(0, 16);
    return key;
  }

  async changeUserSignupEligibility(enable: boolean) {
    const metaTrx = this.components.get(MetaTrx);
    const current = this.components.get(Current);

    return await metaTrx.upsert(
      "site",
      current.siteId,
      "registration",
      enable ? "user" : "none"
    );
  }

  // wpmu_signup_blog
  // wpmu_signup_user
  async insert(input: Input) {
    let data: DataInsert;
    if (input.type == "user") {
      data = {
        domain: "",
        path: "",
        title: "",
        user_login: formatting.username(input.user),
        user_email: input.user_email,
        registered: formatting.dateMySQL(),
        activation_key: this.generateKey(input.user_email),
        meta: input.meta ? phpSerialize(input.meta) : "",
      };
    } else {
      data = {
        domain: input.domain,
        path: input.path,
        title: input.title,
        user_login: formatting.username(input.user),
        user_email: input.user_email,
        registered: formatting.dateMySQL(),
        activation_key: this.generateKey(input.domain),
        meta: input.meta ? phpSerialize(input.meta) : "",
      };
    }

    let dataInsert: any = {};

    try {
      dataInsert = this.validator.execAny(val.trx.signupInsert, data);
    } catch (e) {
      this.logger.warn(`parse error: ${e}`, { data });
      throw e;
    }

    if (!dataInsert) {
      throw new Error(`Invalid signup data - ${JSON.stringify(data)}`);
    }

    const trx = await this.database.transaction;
    let signupId = 0;
    try {
      await trx
        .insert(dataInsert)
        .into(this.tables.get("signups"))
        .then((v) => {
          signupId = v[0];
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert signup - ${e}`);
    }
    await trx.commit();

    return signupId;
  }

  // wpmu_activate_signup
  async activate(
    activationKey: string,
    options?: {
      userRef?: string;
    }
  ) {
    const queryUtil = this.components.get(QueryUtil);
    const current = this.components.get(Current);

    const { userRef } = options ?? {};

    if (!current.site?.props.site.id) {
      throw new Error(`Current site not found`);
    }

    const siteId = current.site.props.site.id;
    const signups = await queryUtil.common("signups", (query) => {
      const { column } = query.alias;
      query.where("activation_key", activationKey);
      if (userRef) {
        query.andWhere((query) => {
          query.builder.where(column("signups", "user_login"), userRef);
          query.or.builder.where(column("signups", "user_email"), userRef);
        });
      }
    });

    if (!signups) {
      throw new Error("Invalid activation key.");
    }

    const signup = signups[0];

    if (1 == signup.active) {
      throw new Error(
        signup.domain.length > 0
          ? "The site is already active."
          : "The user is already active."
      );
    }

    const meta = signup.meta;
    const password = generatePassword(12, false);

    const existingUsers = await queryUtil.users((query) => {
      query.where("user_login", signup.user_login);
    });

    let userId = 0;
    if (!existingUsers) {
      this.logger.info(
        `userLogin: ${signup.user_login}, ${formatting.username(
          signup.user_login
        )} `
      );
      userId = await this.userTrx.upsert(
        {
          user_login: formatting.username(signup.user_login),
          user_email: signup.user_email,
          user_pass: password,
        },
        {
          attachRole: false,
        }
      );
    } else {
      userId = existingUsers[0].ID;
    }

    if (0 == userId) {
      throw new Error("Could not create user");
    }

    const updateDatabase = async () => {
      const trx = await this.database.transaction;
      try {
        await trx
          .table(this.tables.get("signups"))
          .where("activation_key", activationKey)
          .update({
            active: 1,
            activated: formatting.dateMySQL(),
          });
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to activate - ${e}`);
      }
      await trx.commit();
    };

    if (0 >= signup.domain.length) {
      await updateDatabase();
      if (existingUsers) {
        throw new Error("'That username is already activated.' ");
      }

      return {
        user_id: userId,
        password,
        meta,
      };
    }

    const blogs = await queryUtil.blogs((query) => {
      query
        .where("domain", signup.domain)
        .where("path", signup.path)
        .where("site_id", siteId);
    });

    let blogId = 0;

    if (!blogs) {
      blogId = await this.blogTrx.upsert({
        user_id: userId,
        title: signup.title,
        domain: signup.domain,
        path: signup.path,
        site_id: siteId,
        blog_meta: signup.meta as Record<string, any> | undefined,
      });
    } else {
      blogId = blogs[0].blog_id;
    }

    await updateDatabase();

    return {
      blog_id: blogId,
      user_id: userId,
      password,
      title: signup.title,
      meta,
    };
  }

  // Remove the old record
  // Part of wpmu_validate_user_signup
  async remove(
    userLoginOrEmail: string,
    options?: Partial<{
      days: number;
    }>
  ) {
    const { days = 0 } = options ?? {};
    const queryUtil = this.components.get(QueryUtil);

    const signup = await queryUtil.common(
      "signups",
      (query) => {
        query
          .where("user_email", userLoginOrEmail)
          .or.where("user_login", userLoginOrEmail)
          .builder.first();
      },
      val.database.wpSignups
    );

    if (!signup || !signup.registered) {
      return;
    }

    const registered = (
      typeof signup.registered == "string"
        ? new Date(signup.registered)
        : signup.registered
    )?.getTime();

    // Throw error if email was recently registered
    if (new Date().getTime() - registered <= days * 24 * 60 * 60 * 1000) {
      throw new Error(`That email address has already been used.`);
    }

    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("signups"))
        .where("user_login", userLoginOrEmail)
        .orWhere("user_email", userLoginOrEmail)
        .del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to activate - ${e}`);
    }
    await trx.commit();
  }
}
