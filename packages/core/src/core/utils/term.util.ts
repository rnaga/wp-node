import { component } from "../../decorators/component";
import { Components } from "../components";
import { Term } from "../term";
import { QueryUtil } from "./query.util";
import { TaxonomyUtil } from "./taxonomy.util";
import type * as types from "../../types";

@component()
export class TermUtil {
  constructor(
    private components: Components,
    private taxonomyUtil: TaxonomyUtil
  ) {}

  async get(id: number, taxonomyName?: types.TaxonomyName) {
    if (taxonomyName) {
      return await this.components.asyncGet(Term, [id, taxonomyName]);
    } else {
      return await this.components.asyncGet(Term, [id]);
    }
  }

  async toTerms(
    terms: Array<types.Tables["terms"] & types.Tables["term_taxonomy"]>
  ) {
    const arr = [];
    for (const term of terms) {
      arr.push(
        await this.components.asyncGet(Term, [
          term.term_id,
          term.taxonomy,
          term,
        ])
      );
    }
    return arr;
  }

  async getUniqueSlug(slug: string, term: Term) {
    const queryUtil = this.components.get(QueryUtil);
    const taxonomyName = term.taxonomy?.name;

    let parentId = term.props?.parent ?? 0;

    if (!taxonomyName) {
      throw new Error(`Invalid Term - ${taxonomyName}`);
    }

    const needsSuffix =
      (
        (await queryUtil.terms((query) => {
          query.exists("slug", slug, taxonomyName);
        })) ?? []
      ).length > 0;

    /*
     * If the taxonomy supports hierarchy and the term has a parent, make the slug unique
     * by incorporating parent slugs.
     */
    let suffix = "",
      parentSuffix = "";
    const maxLoop = 10;
    let index = 0;
    if (
      needsSuffix &&
      (await this.taxonomyUtil.isHierarchical(taxonomyName)) &&
      0 < parentId
    ) {
      for (; index < maxLoop; index++) {
        const parentTerm = await queryUtil.terms((query) => {
          query.exists("term_id", parentId, taxonomyName);
        });

        if (!parentTerm) {
          break;
        }

        parentSuffix = `${parentSuffix}-${parentTerm[0].slug}`;
        if (
          !(await queryUtil.terms((query) => {
            query.exists("slug", `${slug}${parentSuffix}`, taxonomyName);
          }))
        ) {
          break;
        }

        parentId = parentTerm[0].parent ?? 0;

        if (0 >= parentId) {
          break;
        }
      }
    }

    if (needsSuffix) {
      suffix = `${parentSuffix}`;
      for (index = 1; index < maxLoop + 1; index++) {
        const terms = await queryUtil.terms((query) => {
          query
            .where("taxonomy", taxonomyName)
            .where("slug", `${slug}${suffix}`);
          if (term.props?.term_id) {
            query.builder.not
              .__ref(query)
              .where("term_id", term.props?.term_id);
          }
        });

        if (!terms) {
          break;
        }
        suffix = `${parentSuffix}-${index + 1}`;
      }
    }

    if (index >= maxLoop) {
      return `${slug}-${Math.floor(
        Math.random() * (maxLoop + 999990010 - maxLoop + 1) + maxLoop + 1
      )}`;
    }

    return `${slug}${suffix}`;
  }
}
