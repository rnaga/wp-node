import { User } from "../../core/user";
import type { LogLevel } from "../logging";
import { Context } from "../../core/context";

export interface Actions {
  core_test_action: () => void;
  core_test_async_action: () => Promise<void>;

  /**
   * Triggered when the application context is initialized.
   *
   * @param context - The application context.
   * @returns void - No return value.
   */
  core_init: (context: Context) => void;

  /**
   * Triggered when the user requests a password reset.
   *
   * @param resetKey - The reset key.
   * @param user - The user requesting the password reset.
   * @param siteName - The name of the site.
   * @param registration - Whether the reset key is generated while user self registration.
   * @param context - The application context.
   * @returns Promise<void> - A promise that resolves when the action is complete.
   */
  core_reset_password: (
    resetKey: string,
    user: User,
    siteName: string,
    registration: boolean,
    context: Context
  ) => Promise<void>;

  /**
   * Triggered when a new user is registered.
   *
   * @param userId - The ID of the user.
   * @returns void
   */
  core_register_new_user: (
    activationKey: string,
    userLogin: string,
    email: string,
    context: Context
  ) => Promise<void>;

  /**
   * For logging messages.
   *
   * @param message - The message to log.
   * @param meta - Additional metadata to log.
   * @param level - The log level.
   * @returns void - No return value.
   */
  core_logging: (
    message: string,
    meta: Record<string, any> | undefined,
    level: LogLevel
  ) => void;
}

export type ActionParameters<T extends keyof Actions> = Parameters<Actions[T]>;
export type ActionsReturnType<T extends keyof Actions> = ReturnType<Actions[T]>;
export type ActionsAwaitedReturnType<T extends keyof Actions> = Awaited<
  ReturnType<Actions[T]>
>;
