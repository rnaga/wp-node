import * as val from "../validators";
import { z } from "zod";

export type Parser = {
  parse: (v: any, ...args: any) => any;
  safeParse: (v: any, ...args: any) => any;
};

export type ParserReturnType<T> = T extends Parser
  ? ReturnType<T["parse"]>
  : any;

export type Tables = keyof typeof val.database.wpTables;
export type Field<T extends Tables> =
  keyof (typeof val.database.wpTables)[T]["shape"];

export type PickZodObjectKey<
  T extends z.ZodType<any, any, any>,
  K extends keyof z.infer<T>
> = {
  [P in K]: z.infer<T>[P];
};

export type PickZodObjectKeyInArray<
  T extends z.ZodType<any, any, any>,
  K extends keyof z.infer<T>[number]
> = PickZodObjectKey<T, K>[];
