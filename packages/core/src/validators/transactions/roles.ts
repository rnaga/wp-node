import { z } from "zod";

const roleString = z
  .string()
  .refine((v) => v.match(/^[a-z0-9]+[a-z0-9_]*[a-z0-9]+$/));

export const rolesUpsert = z.object({
  name: z.string().optional(),
  role: roleString,
  new_role: roleString.optional(),
  capabilities: z.array(roleString).optional(),
});
