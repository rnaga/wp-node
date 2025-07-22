import { z } from "zod";
import * as database from "../database";
import { ROLE_NAMES } from "../../constants";
import { booleanWithDefault, string, stringZeroOrOne } from "../helpers";
import { mySQLDate } from "../date";

export const userUpsertMeta = z.object({
  nickname: string.optional().default(""),
  first_name: string.optional().default(""),
  last_name: string.optional().default(""),
  description: string.default(""),
  rich_editing: booleanWithDefault("true"),
  syntax_highlighting: booleanWithDefault("true"),
  comment_shortcuts: booleanWithDefault("false"),
  admin_color: string.default("fresh"),
  use_ssl: stringZeroOrOne,
  show_admin_bar_front: booleanWithDefault("true"),
  locale: string.optional(),
});

// Define the forbidden words
const forbiddenUserLogins = [
  "www",
  "web",
  "root",
  "admin",
  "main",
  "invite",
  "administrator",
];

// Apply when creating a new user
export const userLogin = z
  .string()
  .min(4)
  .max(60)
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_-]*$/)
  .refine((value) => /[a-z_-]/.test(value))
  .refine((value) => !/^[-0-9]*$/.test(value))
  .refine((value) => !forbiddenUserLogins.includes(value));

export const userUpsert = database.wpUsers.merge(
  z
    .object({
      ID: z.number().int().nonnegative().optional(),
      user_login: z.string(),
      user_registered: mySQLDate, //z.union([z.string(), z.date(), z.undefined()]),
      role: z.union([
        z
          .enum([...ROLE_NAMES])
          .optional()
          .default("subscriber"),
        z.array(z.enum([...ROLE_NAMES])).optional(),
        z.array(z.string()).optional(),
      ]),
      meta_input: z.record(z.string(), z.any()).optional().default({}),
    })
    .merge(userUpsertMeta)
);

export const userInsert = database.wpUsers.pick({
  user_pass: true,
  user_login: true,
  user_nicename: true,
  user_email: true,
  user_url: true,
  user_registered: true,
  user_activation_key: true,
  display_name: true,
});

export const userUpdate = userInsert.omit({
  user_login: true,
});
