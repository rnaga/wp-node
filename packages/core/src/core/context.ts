import { Config } from "../config";
import { Components } from "./components";
import { Current } from "./current";
import { Hooks } from "./hooks/hooks";
import { Options } from "./options";
import { Roles } from "./roles";
import { Utils } from "./utils/utils";
import { Vars } from "./vars";
import { Logger } from "./logger";

import type * as types from "../types/";

export class Context {
  readonly config: Config;
  hooks: Hooks;
  current: Current;
  roles: Roles;
  utils: Utils;
  vars: Vars;
  options: Options;
  logger: Logger;

  #components: Components;

  constructor(
    config: types.Config,
    public readonly args: { env: string; hooks: Hooks }
  ) {
    this.#components = new Components(this.env);

    this.config = this.#components.get(Config, [config]);
    this.roles = this.#components.get(Roles);
    this.current = this.#components.get(Current);
    this.utils = this.#components.get(Utils);
    this.options = this.#components.get(Options);
    this.vars = this.#components.get(Vars);
    this.logger = this.#components.get(Logger);

    this.hooks = args.hooks;
  }

  get components() {
    return this.#components;
  }

  get env() {
    return this.args.env ?? "default";
  }

  async clone() {
    return Context.getInstance(this.config.config, {
      env: this.env,
      hooks: this.hooks,
    });
  }

  static async getInstance(
    config: types.Config,
    args: { env: string; hooks: Hooks; installing?: boolean }
  ) {
    const { env, hooks, installing = false } = args;
    const context = new Context(config, { env, hooks });
    context.vars.CONTEXT = context;

    context.hooks.action.do("core_init", context);

    try {
      if (config.multisite.enabled) {
        await context.current.switchSite(
          config.multisite.defaultSiteId,
          config.multisite.defaultBlogId
        );
      } else {
        await context.current.setUserRoles();
      }

      // Set current user and role as anonymous
      await context.current.assumeUser();
    } catch (e) {
      // Roles are defined in DB and an error gets thrown if it doesn't exit.
      // To be certain, set default roles.
      context.current.setDefaultUserRoles();

      // If installoing is enabled, then ignore the error.
      // During installation, it's expected the error is thrown since the database is not yet setup.
      !installing &&
        console.warn(`Failed to initialize the Current component.`, e);
    } finally {
      await context.current.setTimezone();
    }

    return context;
  }
}
