import { z } from "zod";

import { Scope } from "../constants";
import { asyncInit } from "../decorators/async-init";
import { component } from "../decorators/component";
import * as val from "../validators";
import { Components } from "./components";
import { Taxonomy } from "./taxonomy";
import { QueryUtil } from "./utils/query.util";

import type * as types from "../types";
import { Meta } from "./meta";
import { Logger } from "./logger";

const schemaProps = val.database.wpTerms.merge(
  val.database.wpTermTaxonomy.merge(val.database.wpTermRelationships)
);
// .merge(val.database.wpTermRelationships);

type Props = z.infer<typeof schemaProps>;

@component({ scope: Scope.Transient })
export class Term {
  #taxonomy?: Taxonomy;

  constructor(
    public meta: Meta,
    private logger: Logger,
    private components: Components,
    private queryUtil: QueryUtil,
    private termId: number,
    private _taxonomyName: types.TaxonomyName | undefined,

    private _props: Props
  ) {
    this.meta.set("term", termId);
  }

  get taxonomyName() {
    return !this._taxonomyName ? undefined : this._taxonomyName;
  }

  get taxonomy() {
    return this.#taxonomy;
  }

  get props() {
    return !this._props ? undefined : this._props;
  }

  async children() {
    return await this.queryUtil.terms((query) => {
      query.withChildren("parent", [this.termId]);
    });
  }

  setTaxonomy(taxonomy: Taxonomy) {
    this.#taxonomy = taxonomy;
    this._taxonomyName = this.#taxonomy.name;
  }

  withProps(props: Partial<Props>) {
    this._props = { ...this._props, ...props };
    return this;
  }

  @asyncInit
  private async init() {
    if (!this._props) {
      const term = await this.queryUtil.terms((query) => {
        query.get(this.termId);
      }, val.database.wpTerms.merge(val.database.wpTermTaxonomy)); //.merge(val.database.wpTermRelationships));

      if (!term) {
        this.logger.info(`Term not found: ${this.termId}`);
      } else {
        this._props = schemaProps.parse(term);
      }
    }

    try {
      if (!this._taxonomyName) {
        this._taxonomyName =
          (this._props?.taxonomy as types.TaxonomyName) ?? undefined;
      }
      this.#taxonomy = await this.components.asyncGet(Taxonomy, [
        this._taxonomyName,
      ]);
    } catch (e) {
      this.logger.info(`Taxonomy not found: ${this.termId}`);
    }
  }
}
