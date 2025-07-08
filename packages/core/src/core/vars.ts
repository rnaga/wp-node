import { component } from "../decorators/component";
import { Context } from "./context";
import type * as types from "../types";

@component()
export class Vars {
  static globalMap = new Map();
  map = new Map();

  get TABLES_MS_CURRENT_INDEX() {
    return this.map.get("TABLES_MS_CURRENT_INDEX") ?? 0;
  }

  set TABLES_MS_CURRENT_INDEX(index: number) {
    this.map.set("TABLES_MS_CURRENT_INDEX", index);
  }

  get DOING_AUTOSAVE() {
    return this.map.get("DOING_AUTOSAVE") ?? false;
  }

  set DOING_AUTOSAVE(save: boolean) {
    this.map.set("DOING_AUTOSAVE", save);
  }

  get CONTEXT() {
    return this.map.get("CONTEXT");
  }

  set CONTEXT(context: Context) {
    this.map.set("CONTEXT", context);
  }

  get USER_ROLES() {
    return this.map.get("USER_ROLES");
  }

  set USER_ROLES(roles: types.Roles) {
    this.map.set("USER_ROLES", roles);
  }

  set TZ_IDENTIFIER(tz: string) {
    this.map.set("TZ_IDENTIFIER", tz);
  }

  get TZ_IDENTIFIER() {
    return this.map.get("TZ_IDENTIFIER") ?? "Etc/GMT";
  }

  set TIME_OFFSET_MINUTES(offset: number) {
    this.map.set("TIME_OFFSET_MINUTES", offset);
  }

  get TIME_OFFSET_MINUTES() {
    return this.map.get("TIME_OFFSET_MINUTES") ?? 0;
  }
}
