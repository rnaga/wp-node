import { z } from "zod";
/*
 * @param array $passwords {
 *     The list of application passwords.
 *
 *     @type array ...$0 {
 *         @type string      $uuid      The unique identifier for the application password.
 *         @type string      $app_id    A UUID provided by the application to uniquely identify it.
 *         @type string      $name      The name of the application password.
 *         @type string      $password  A one-way hash of the password.
 *         @type int         $created   Unix timestamp of when the password was created.
 *         @type int|null    $last_used The Unix timestamp of the GMT date the application password was last used.
 *         @type string|null $last_ip   The IP address the application password was last used by.
 *     }
 * }
 *
 */
export const applicationPassword = z.object({
  uuid: z.string(),
  app_id: z.string(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
  created: z.number().min(0),
  last_used: z.number().min(0).nullable(),
  last_ip: z
    .string()
    // .regex(
    //   /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    //   { message: "Invalid IPv4 address" }
    // )
    .nullable(),
});
