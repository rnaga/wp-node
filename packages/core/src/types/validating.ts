import * as val from "../validators";

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
