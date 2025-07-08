import { Scope } from "./constants/scope";
import { component } from "./decorators/component";
import type * as types from "./types";
import * as val from "./validators";

@component({ scope: Scope.Singleton })
export class Config {
  #config: types.Config;

  constructor(config: types.Config) {
    this.#config = structuredClone(config); //Application.config);
  }

  isMultiSite() {
    return this.#config.multisite?.enabled ?? false;
  }

  isSsl() {
    return this.#config.constants.LINK_USE_SSL ?? true;
  }

  // is_subdomain_install
  isSubdomainInstall() {
    return (
      this.#config.multisite.subdomainInstall ||
      "yes" === this.#config.multisite.vhost
    );
  }

  get config() {
    return this.#config;
  }

  set(config: types.DeepPartial<types.Config>) {
    this.#config = val.config.config.parse({ ...this.#config, ...config });
  }
}
