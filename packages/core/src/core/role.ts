import { DO_NOT_ALLOW, ROLE_CAPABILITIES, Scope } from "../constants";
import { component } from "../decorators/component";
import { Capabilities } from "./capabilities";
import { Components } from "./components";
import { User } from "./user";

import type * as types from "../types";
import { Config } from "../config";

@component({ scope: Scope.Transient })
export class Role {
  public names: Set<string> = new Set();
  public capabilities: Set<string> = new Set();

  constructor(
    private components: Components,
    private config: Config,
    public readonly primaryName: types.RoleNames = "anonymous",
    capabilities: string[] = []
  ) {
    (this.primaryName as string) = this.primaryName.toLowerCase();
    this.addNames([this.primaryName]);
    if (Array.isArray(capabilities)) {
      this.add(capabilities);
    }
  }

  addNames(names: string[]) {
    names.map((name) => this.names.add(name.toLowerCase()));
  }

  // is_super_admin
  isSuperAdmin() {
    return (
      (this.config.isMultiSite() && this.is("superadmin")) ||
      (!this.config.isMultiSite() && this.has("delete_users"))
    );
  }

  isAdmin() {
    return this.is("administrator") || this.isSuperAdmin();
  }

  is<T>(roleName: T): boolean;
  is<T extends types.RoleNames>(roleName: T) {
    return this.names.has(roleName);
  }

  add(capabilities: string[]) {
    capabilities.map((capability) => this.capabilities.add(capability));
  }

  has<T>(cap: T): boolean;
  has<T extends (typeof ROLE_CAPABILITIES)[number]>(cap: T) {
    return this.capabilities.has(cap);
  }

  async can<T extends types.RoleCapabilityActions>(
    action: T,
    user: number | User,
    ...args: any
  ): Promise<boolean>;
  async can(
    action: string,
    user: number | User,
    ...args: any
  ): Promise<boolean>;
  async can(action: any, user: number | User, ...args: any) {
    if (typeof action === "undefined") {
      return false;
    }

    const capabilities = this.components.get(Capabilities);

    const results = await capabilities.check(action, user, ...args);

    if (results.includes(DO_NOT_ALLOW)) {
      return false;
    }

    return results.length == results.filter((cap) => this.has(cap)).length;
  }
}
