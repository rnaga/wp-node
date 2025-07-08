import { serialize, unserialize } from "php-serialize";

export const phpSerialize = (data: any) => serialize(data);

export const phpUnserialize = <T = any>(data: any, failSafe = true) => {
  try {
    return unserialize(data) as T;
  } catch (e) {
    if (failSafe) return data as T;
    throw e;
  }
};
