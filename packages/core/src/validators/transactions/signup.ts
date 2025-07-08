import { z } from "zod";
import * as database from "../database";

export const signupInsert = database.wpSignups
  .pick({
    domain: true,
    path: true,
    title: true,
    user_login: true,
    user_email: true,
    activation_key: true,
    registered: true,
  })
  .merge(
    z.object({
      meta: z.string().default(""),
    })
  );
