import { component } from "../../decorators/component";
import { Components } from "../components";
import { Options } from "../options";
import { Taxonomy } from "../taxonomy";
import type * as types from "../../types";
import { Config } from "../../config";

@component()
export class TaxonomyUtil {
  constructor(private components: Components, private config: Config) {}

  async get(key: string) {
    return this.components.asyncGet(Taxonomy, [key]);
  }

  async getDefaultTerm(taxonomy: types.TaxonomyName) {
    const options = this.components.get(Options);
    const key =
      taxonomy == "category" ? "default_category" : `default_term_${taxonomy}`;
    const result = await options.get(key);
    return result ? parseInt(result) : 0;
  }

  async isHierarchical(taxonomyName: types.TaxonomyName) {
    const taxonomy = await this.get(taxonomyName);
    return taxonomy.props?.hierarchical ?? false;
  }

  // get_object_taxonomies
  async getList(args?: {
    objectType?: types.TaxonomyObjectType;
  }): Promise<Taxonomy[]>;
  async getList(args?: { objectType: string | undefined }): Promise<Taxonomy[]>;
  async getList(args: { objectType: any } = { objectType: "post" }) {
    const taxonomies: Taxonomy[] = [];
    for (const [taxonomyName, config] of Object.entries(
      this.config.config.taxonomy.settings
    )) {
      if (config.objectType === args.objectType) {
        taxonomies.push(await this.get(taxonomyName));
      }
    }

    return taxonomies;
  }
}
