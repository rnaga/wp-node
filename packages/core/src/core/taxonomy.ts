import { z } from "zod";

import { Config } from "../config";
import { Scope } from "../constants";
import { asyncInit } from "../decorators/async-init";
import { component } from "../decorators/component";
import * as val from "../validators";
import { Components } from "./components";
import { TaxonomyUtil } from "./utils/taxonomy.util";

import type * as types from "../types";
import { Logger } from "./logger";
type Props = z.infer<
  typeof val.config.config
>["taxonomy"]["settings"][string] & {
  default_term: number;
};

const defaultCapabilities = {
  manage_terms: "manage_categories",
  edit_terms: "manage_categories",
  delete_terms: "manage_categories",
  assign_terms: "edit_posts",
};

@component({ scope: Scope.Transient })
export class Taxonomy {
  #props: Props | undefined;
  #isDefault: boolean;
  constructor(
    private config: Config,
    private components: Components,
    logger: Logger,
    private key: string
  ) {
    if (!this.config.config.taxonomy.settings[key]) {
      logger.info(`Taxonomy not found: ${key}`);
      this.#props = undefined;
      this.#isDefault = true;
      return;
    }
    this.#isDefault = false;
  }

  get isDefault() {
    return this.#isDefault;
  }

  get name() {
    return this.key as types.TaxonomyName;
  }

  get props() {
    return this.#props;
  }

  withProps(props: Partial<Props>) {
    this.#props = { ...this.#props, ...(props as any) };
    return this;
  }

  @asyncInit
  private async init() {
    const defaultTerm = await this.components
      .get(TaxonomyUtil)
      .getDefaultTerm(this.key as any);

    this.#props = {
      ...this.config.config.taxonomy.settings[this.key],
      default_term: defaultTerm,
    };

    this.#props.capabilities = {
      ...defaultCapabilities,
      ...this.#props.capabilities,
    };
  }
}
