import { Config } from "../config";
import { DEFAULT_DATABASE_TABLES, Scope } from "../constants";
import { component } from "../decorators/component";
import { Vars } from "./vars";

import type * as types from "../types";
@component({ scope: Scope.Transient })
export class Tables {
  #multiSiteIndex: number = -99;
  constructor(private config: Config, private vars: Vars) {}

  private get indexInVars() {
    return this.vars.TABLES_MS_CURRENT_INDEX ?? 0;
  }

  resetIndex() {
    this.#multiSiteIndex = -99;
  }

  get index() {
    if (this.config.isMultiSite()) {
      if (this.#multiSiteIndex > 0) {
        return this.#multiSiteIndex;
      }
      return this.indexInVars;
    }
    return 0;
  }

  set index(index: number) {
    if (this.config.isMultiSite()) {
      this.#multiSiteIndex = index;
    }
  }

  get prefix() {
    const msPrefex = this.index > 1 ? `${this.index}_` : "";
    return `${this.config.config.tablePrefix}${msPrefex}`;
  }

  get basePrefix() {
    return this.config.config.tablePrefix;
  }

  get(name: string): string;
  get(name: types.TableNames): string;
  get(name: any) {
    if (
      this.config.isMultiSite() &&
      DEFAULT_DATABASE_TABLES.blog.includes(name)
    ) {
      return `${this.prefix}${name}`;
    }
    return `${this.config.config.tablePrefix}${name}`;
  }
}
