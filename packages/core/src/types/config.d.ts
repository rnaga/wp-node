import { z } from "zod";

import * as val from "../validators";
import type { TaxonomyObject } from "./taxonomy";
import type { PostTypeObject, PostStatusObject } from "./post";
import type { DeepPartial } from "./common";

export type Config = z.infer<typeof val.config.config>;
export type Configs = z.infer<typeof val.config.configs>;

export type ConfigTaxonomy = Omit<TaxonomyObject, "objectType" | "_builtin"> & {
  objectType?: string;
};

export type ConfigPostTypeObject = Partial<
  Omit<PostTypeObject[string], "_builtin" | "supports">
> & {
  supports?: string[];
};

export type ConfigPostStatusObject = Omit<
  PostStatusObject[string],
  "label" | "_builtin"
>;

export type DatabaseConfig = Config["database"];

export type JSONWPConfig = DeepPartial<Omit<Config, "database">> &
  Required<{
    staticAssetsPath: Config["staticAssetsPath"];
  }>;

export type JSONConfigTaxonomy = Record<string, ConfigTaxonomy>;
export type JSONConfigPostTypeObject = Record<string, ConfigPostTypeObject>;
export type JSONConfigPostStatusObject = Record<string, ConfigPostStatusObject>;
