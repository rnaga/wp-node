import { z } from "zod";

import { ROLE_CAPABILITIES, ROLE_NAMES } from "../constants/";
import * as val from "../validators";

interface RoleNamesExtend {}

export type RoleNames<T = "anonymous"> =
  | Lowercase<(typeof ROLE_NAMES)[number]>
  | T
  | keyof RoleNamesExtend;

// export type UpsertRoleName<T = "subscriber"> =
//   | "administrator"
//   | "editor"
//   | "author"
//   | "contributor"
//   | "subscriber"
//   | T;

export type UpsertRoleName = string[] | RoleNames;

export type Capabilities<T = "unknown"> =
  | (typeof ROLE_CAPABILITIES)[number]
  | T;

export type Role = z.infer<typeof val.roles.role>;
export type Roles = z.infer<typeof val.roles.roles>;

// form stored in DB (wp_options)
export type RoleRecord = Record<
  string,
  { name: string; capabilities: Record<string, true> }
>;
