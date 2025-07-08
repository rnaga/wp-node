import { z } from "zod";
import { formatting } from "../common";

export const mySQLDate = z.union([
  z.string().default(() => formatting.dateMySQL()),
  z.undefined(),
  z.unknown().transform(() => undefined),
]);

export const mySQLDateWithZeroDefaultDate = z.union([
  z.string().default("0000-00-00T00:00:00Z"),
  z.undefined(),
  z.unknown().transform(() => undefined),
]);
