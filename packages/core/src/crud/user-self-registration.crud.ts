import { formatting } from "../common";
import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Logger } from "../core/logger";
import { Options } from "../core/options";
import { UserSelfRegistrationUtil } from "../core/utils/user-self-registration.util";
import { UserUtil } from "../core/utils/user.util";
import { component } from "../decorators/component";
import { UserTrx } from "../transactions";
import * as vals from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

@component()
export class UserSelfRegistrationCrud extends Crud {
  constructor(
    components: Components,
    private config: Config,
    private logger: Logger
  ) {
    super(components);
  }

  private async checkPermission(siteId?: number) {
    const { user } = await this.getUser();

    // Multi site
    if (this.config.isMultiSite()) {
      const current = this.components.get(Current);
      siteId = siteId ?? current.siteId;

      if (!siteId || !(await user.can("manage_site_users", [siteId]))) {
        throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
      }
    }

    // Single site
    if (!this.config.isMultiSite() && !(await user.can("edit_users"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }
  }

  private async checkEligibility(
    userSelfRegistrationUtil: UserSelfRegistrationUtil
  ) {
    if (!(await userSelfRegistrationUtil.canSignup())) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Not allowed");
    }
  }

  async canSignup() {
    const userSelfRegistrationUtil = this.components.get(
      UserSelfRegistrationUtil
    );

    return this.returnValue(await userSelfRegistrationUtil.canSignup());
  }

  async update(
    input: {
      eligibility: boolean;
    },
    options: {
      siteId?: number;
    } = {}
  ) {
    await this.checkPermission(options.siteId);

    const userSelfRegistrationUtil = this.components.get(
      UserSelfRegistrationUtil
    );

    return this.returnValue(
      await userSelfRegistrationUtil.changeEligibility(input.eligibility)
    );
  }

  /**
   * Register a new user without activation key
   *
   * Use this when user registers through external id provider
   *
   * @param args - user_login, email, blog_id
   * @returns boolean
   *
   */
  async registerWithoutActivation(args: {
    email: string;
    user_login?: string;
    name?: string;
  }) {
    const { email } = args;
    const userSelfRegistrationUtil = this.components.get(
      UserSelfRegistrationUtil
    );

    await this.checkEligibility(userSelfRegistrationUtil);

    const parsedEmail = vals.trx.userInsert.shape.user_email.safeParse(email);

    if (!parsedEmail) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid email");
    }

    const userUtil = this.components.get(UserUtil);
    let userLogin = args.user_login;

    if (!userLogin) {
      userLogin = await userUtil.getUniqueUserLogin();
    } else {
      const user = await userUtil.get(userLogin as string);

      // User already exists
      if (user.props?.ID) {
        throw new CrudError(StatusMessage.BAD_REQUEST, "User already exists");
      }
    }

    const { firstName, lastName } = formatting.parseName(args.name ?? "");

    // Create a new user
    const options = this.components.get(Options);
    const defaultRole = await options.get("default_role");

    if (!defaultRole) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Default role not found");
    }

    const userTrx = this.components.get(UserTrx);

    const result = await userTrx.upsert(
      {
        user_login: userLogin,
        display_name: userLogin,
        user_email: email,
        first_name: firstName,
        last_name: lastName,
        role: [defaultRole],
      },
      {
        attachRole: true,
      }
    );

    return this.returnValue({
      user_id: result,
      user_login: userLogin,
      user_email: email,
      first_name: firstName,
      last_name: lastName,
    });
  }

  async register(args: { user_login: string; email: string }) {
    const userSelfRegistrationUtil = this.components.get(
      UserSelfRegistrationUtil
    );

    await this.checkEligibility(userSelfRegistrationUtil);

    const { user_login: userLogin, email } = args;

    const result = await userSelfRegistrationUtil.registerNew(userLogin, email);
    return this.returnValue(!!result.id);
  }

  async activate(args: { key: string; user_login: string }) {
    const { key: activationKey, user_login: userLogin } = args;
    const userSelfRegistrationUtil = this.components.get(
      UserSelfRegistrationUtil
    );

    await this.checkEligibility(userSelfRegistrationUtil);

    const result = await userSelfRegistrationUtil.activate(
      activationKey,
      userLogin
    );
    return this.returnValue(result);
  }
}
