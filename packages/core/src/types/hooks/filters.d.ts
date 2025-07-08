import type { RoleCapabilityActions } from "../capabilities";
import { Context } from "../../core/context";
import { User } from "../../core/user";

/**
 * Represents a collection of filters.
 */
export interface Filters {
  /**
   * Filter for testing a filter.
   *
   * @param data - The data to be filtered.
   * @returns The filtered data.
   */
  test_filter: (data: number) => number;

  /**
   * Filter for validating a user's capabilities.
   *
   * @param capabilities - The set of capabilities to validate.
   * @param context - The application context.
   * @param action - The action being performed.
   * @param user - The user performing the action.
   * @param args - Additional arguments passed to the filter.
   * @returns A promise that resolves with the validated capabilities.
   */
  core_map_meta_cap: (
    capabilities: Set<string>,
    context: Context,
    action: RoleCapabilityActions,
    user: User,
    ...args: any
  ) => Promise<Set<string>>;

  /**
   * Filter for validating a user's capabilities of managing network users.
   *
   * @param capabilities - The set of capabilities to validate.
   * @param context - The application context.
   * @param user - The user performing the action.
   * @param args - Additional arguments passed to the filter.
   * @returns A promise that resolves with the validated capabilities.
   */
  core_map_meta_cap_manage_network_users: (
    capabilities: Set<string>,
    context: Context,
    user: User,
    ...args: any
  ) => Promise<Set<string>>;

  /**
   * Filter for validating a user's capabilities of deleting a user.
   *
   * @param capabilities - The set of capabilities to validate.
   * @param context - The application context.
   * @param user - The user performing the action.
   * @param args - Additional arguments passed to the filter.
   * @returns A promise that resolves with the validated capabilities.
   */
  core_map_meta_cap_delete_user: (
    capabilities: Set<string>,
    context: Context,
    user: User,
    ...args: any
  ) => Promise<Set<string>>;

  /**
   * Filter for generating a unique user login.
   *
   * @param userLogin - Randomly generated user login
   * @returns A promise that resolves with the unique user login.
   */
  core_unigue_user_login: (userLogin: string) => Promise<string>;
}

type Parameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never;

export type FilterParameters<T extends keyof Filters> = Parameters<Filters[T]>;
export type FiltersReturnType<T extends keyof Filters> = ReturnType<Filters[T]>;
export type FiltersAwaitedReturnType<T extends keyof Filters> = Awaited<
  ReturnType<Filters[T]>
>;
