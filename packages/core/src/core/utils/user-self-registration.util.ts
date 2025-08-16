import { Config } from "../../config";
import { Scope } from "../../constants";
import { component } from "../../decorators/component";
import { OptionsTrx } from "../../transactions/options.trx";
import { SignupTrx } from "../../transactions/signup.trx";
import { UserTrx } from "../../transactions/user.trx";
import { Components } from "../components";
import { Logger } from "../logger";
import { Options } from "../options";
import { Vars } from "../vars";
import { QueryUtil } from "./query.util";
import { SignupUtil } from "./signup.util";
import { UserUtil } from "./user.util";

@component({ scope: Scope.Transient })
export class UserSelfRegistrationUtil {
  constructor(
    private config: Config,
    private components: Components,
    private signupUtil: SignupUtil,
    private signupTrx: SignupTrx,
    private options: Options,
    private optionsTrx: OptionsTrx,
    private userTrx: UserTrx,
    private userUtil: UserUtil,
    private vars: Vars,
    private logger: Logger
  ) {}

  async canSignup(): Promise<boolean> {
    if (this.config.isMultiSite()) {
      // If the site is multisite, check if the registration type is 'all' or 'user' in signup table
      return await this.signupUtil.canUserSignup();
    }

    // For single site, check 'users_can_register' option in options table
    // See get_option( 'users_can_register' ) in wp-login.php
    return (
      parseInt((await this.options.get("users_can_register")) ?? "0") === 1
    );
  }

  async changeEligibility(enable: boolean) {
    if (this.config.isMultiSite()) {
      // If the site is multisite, update the registration type in signup table
      return await this.signupTrx.changeUserSignupEligibility(enable);
    }

    // For single site, update 'users_can_register' option in options table
    return await this.optionsTrx.update("users_can_register", enable ? 1 : 0);
  }

  /**
   * Register a new user
   *
   * Multisite: create a new record in the signup table along with activation key
   * Single site: create a new user in the users table along with activation key
   *
   * After this gets called, "activate" should be called to validate activation key and activate the user.
   *
   * @param userLogin - Username
   * @param email - Email
   * @returns number - New user ID
   */
  async registerNew(userLogin: string, email: string) {
    if (!(await this.canSignup())) {
      throw new Error("User registration is not allowed.");
    }

    let id: number;

    // Multi-site
    if (this.config.isMultiSite()) {
      const [success, error] = await this.signupUtil.validateUser(
        userLogin,
        email
      );

      if (!success) {
        throw new Error(error);
      }

      id = await this.signupTrx.insert({
        type: "user",
        user: userLogin,
        user_email: email,
      });
    } else {
      // Single site
      id = await this.userTrx.registerNew(userLogin, email);
    }

    if (!id) {
      throw new Error("Could not create user");
    }

    const activationKey = await this.getActivationKey(userLogin, email);

    if (!activationKey) {
      throw new Error("Could not create activation key");
    }

    const context = this.vars.CONTEXT;
    context.hooks.action.do(
      "core_register_new_user",
      activationKey,
      userLogin,
      email,
      context
    );

    return {
      id,
      userLogin,
      email,
      activationKey,
    };
  }

  // This works only after registerNew is called
  async getActivationKey(userLogin: string, email: string) {
    const queryUtil = this.components.get(QueryUtil);

    if (this.config.isMultiSite()) {
      const signups = await queryUtil.common("signups", (query) => {
        query
          .where("user_login", userLogin)
          .where("user_email", email)
          .builder.limit(1);
      });

      return signups?.[0].activation_key;
    }

    return await this.userUtil.getPasswordResetKey(userLogin);
  }

  async activate(
    activationKey: string,
    userRef: string
  ): Promise<[boolean, string]> {
    let userId: number = 0;
    let success = false;

    if (this.config.isMultiSite()) {
      const result = await this.signupTrx.activate(activationKey, {
        userRef,
      });
      userId = result.user_id;
      success = result.user_id > 0;
    } else {
      const userIdOrFalse = await this.userUtil.checkPasswordResetKey(
        activationKey,
        userRef
      );
      success = false !== userIdOrFalse && userIdOrFalse > 0;
      if (success) {
        userId = userIdOrFalse as number;
      }
    }

    if (!success) {
      this.logger.error("Could not activate user", { userRef });
      return [false, "Could not activate user"];
    }

    // Attach default role
    const defaultRole = await this.options.get("default_role");
    await this.userTrx.upsertRole(userId, defaultRole);

    // Account activated. Generate reset key for user to set password
    const resetKey = await this.userUtil.getPasswordResetKey(userRef, {
      registration: true,
    });

    return [true, resetKey];
  }
}
