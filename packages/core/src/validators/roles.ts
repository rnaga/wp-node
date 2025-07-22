import { z } from "zod";

export const role = z.object({
  name: z.string(),
  capabilities: z.array(z.string()),
});

export const roles = z.record(z.string(), role);
