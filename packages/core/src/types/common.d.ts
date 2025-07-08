// eslint-disable-next-line @typescript-eslint/ban-types
export type Abstract<T> = Function & { prototype: T };
export type Constructor<T = any> = new (...args: any[]) => T;
export type Class<T> = Abstract<T> | Constructor<T>;

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
