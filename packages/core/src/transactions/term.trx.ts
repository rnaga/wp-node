import { z } from "zod";

import { formatting } from "../common";
import { Components } from "../core/components";
import { Logger } from "../core/logger";
import { Options } from "../core/options";
import { Taxonomy } from "../core/taxonomy";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { TaxonomyUtil } from "../core/utils/taxonomy.util";
import { TermUtil } from "../core/utils/term.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import { TermsQuery } from "../query-builder";
import * as val from "../validators";
import { MetaTrx } from "./meta.trx";
import { Trx } from "./trx";

import type * as types from "../types";
@transactions()
export class TermTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private taxonomyUtil: TaxonomyUtil,
    private termUtil: TermUtil,
    private postUtil: PostUtil,
    private validator: Validator
  ) {
    super(components);
  }

  // wp_update_term_count
  // wp_update_term_count_now
  async updateCount(termTaxonomyIds: number[], taxonomy: Taxonomy) {
    const queryUtil = this.components.get(QueryUtil);

    if (typeof taxonomy == "string") {
      taxonomy = await this.taxonomyUtil.get(taxonomy);
    }
    if (taxonomy.isDefault || !taxonomy.props?.objectType) {
      return;
    }

    let objectTypes = taxonomy.props.objectType.split(":");

    let isAttachment = false;
    if (objectTypes.includes("attachment")) {
      isAttachment = true;
      objectTypes = objectTypes.filter((o) => o != "attachment");
    }

    // To unique array
    objectTypes = [...new Set(objectTypes)];

    const isPostType =
      objectTypes.filter((objectType) =>
        this.postUtil.getTypeObject(objectType)
      ).length > 0;

    // For posts - _update_post_term_count
    for (const termTaxonomyId of termTaxonomyIds) {
      let count = 0,
        counts: z.infer<typeof val.query.resultCount>;

      const postStatuses: types.PostStatus[] = ["publish"];

      if (isPostType || isAttachment) {
        if (isAttachment) {
          counts = await queryUtil.posts((query) => {
            query.countAttachment(termTaxonomyId, postStatuses);
          }, val.query.resultCount);
        }

        count += counts?.count ?? 0;

        if (objectTypes.length > 0) {
          counts = await queryUtil.posts((query) => {
            query.countTerm(
              termTaxonomyId,
              postStatuses,
              objectTypes as types.PostType[]
            );
          }, val.query.resultCount);
        }
        count += counts?.count ?? 0;
        // _update_generic_term_count
      } else {
        counts = await queryUtil.terms((query) => {
          query.selectTermRelationships
            .where("terms_relationships.term_taxonomy_id", termTaxonomyId)
            .builder.count("* as count")
            .first();
        }, val.query.resultCount);

        count = counts?.count ?? 0;
      }

      const trx = await this.database.transaction;
      try {
        await trx
          .table(this.tables.get("term_taxonomy"))
          .update({
            count,
          })
          .where("term_taxonomy_id", termTaxonomyId);
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to update term count - ${termTaxonomyId}`);
      }
      await trx.commit();
    }
  }

  async updateTermOrder(
    objectId: number,
    taxonomyName: types.TaxonomyName,
    termTaxonomyIds?: number[],
    options?: {
      append?: boolean;
    }
  ) {
    const { append = true } = options ?? {};
    const queryUtil = this.components.get(QueryUtil);

    termTaxonomyIds = termTaxonomyIds ?? [];

    // Get terms associated with the object
    const existingTerms =
      (await queryUtil.terms((query) => {
        query.withObjectIds([objectId]).where("taxonomy", taxonomyName);
      })) ?? [];

    // Get term taxonomy ids excluding the passed term taxonomy ids
    const existingTermTaxonomyIds = existingTerms
      .filter((term) => !termTaxonomyIds?.includes(term.term_taxonomy_id))
      .map((term) => term.term_taxonomy_id);

    // if append is true, append the termTaxonomyIds to the existingTermTaxonomyIds
    // else, append the existingTermTaxonomyIds to the termTaxonomyIds
    termTaxonomyIds = append
      ? [...existingTermTaxonomyIds, ...termTaxonomyIds]
      : [...termTaxonomyIds, ...existingTermTaxonomyIds];

    let termOrder = 0;
    for (const termTaxonomyId of termTaxonomyIds) {
      // Check if term relationships exists for the object
      const term = existingTerms.find(
        (term) => term.term_taxonomy_id === termTaxonomyId
      );

      // Skip if term not found
      if (!term) {
        continue;
      }

      const trx = await this.database.transaction;
      try {
        await trx
          .table(this.tables.get("term_relationships"))
          .where("object_id", objectId)
          .where("term_taxonomy_id", termTaxonomyId)
          .update({
            term_order: termOrder++,
          });
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to update term order - ${termTaxonomyId}`);
      }
      await trx.commit();
    }
  }

  // wp_delete_object_term_relationships
  async removeObjectTermRelationships(
    objectId: number,
    taxonomyNames: types.TaxonomyName[]
  ) {
    const queryUtil = this.components.get(QueryUtil);
    for (const taxonomyName of taxonomyNames) {
      const termIds = (
        (await queryUtil.terms((query) => {
          query.withObjectIds([objectId]).where("taxonomy", taxonomyName);
        })) ?? []
      ).map((term) => term.term_id);

      if (termIds.length > 0) {
        await this.removeObject(
          objectId,
          termIds,
          await this.taxonomyUtil.get(taxonomyName)
        );
      }
    }
  }

  // wp_remove_object_terms
  async removeObject(
    objectId: number,
    terms: Array<string | number>,
    taxonomy: Taxonomy
  ) {
    const queryUtil = this.components.get(QueryUtil);
    if (taxonomy.isDefault) {
      return false;
    }

    if (0 >= terms.length) {
      return false;
    }

    const termsTaxonomyIds = (
      (await queryUtil.terms((query, builders) => {
        query.where("taxonomy", taxonomy.name).builder.where((subBuilder) => {
          const subQuery = builders.get(TermsQuery, subBuilder, query.alias);
          for (const slugOrTermId of terms) {
            if (typeof slugOrTermId == "string") {
              subQuery.andWhere((query) =>
                query
                  .where("slug", formatting.slug(slugOrTermId))
                  .or.where("name", slugOrTermId)
              );
            } else {
              subQuery.where("term_id", slugOrTermId);
            }
            subQuery.builder.or;
          }
        });
      })) ?? []
    ).map((v) => v.term_taxonomy_id);

    if (0 >= termsTaxonomyIds.length) {
      return false;
    }

    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("term_relationships"))
        .where("object_id", objectId)
        .whereIn("term_taxonomy_id", termsTaxonomyIds)
        .del();
    } catch (e) {
      await trx.rollback();
      return false;
    }
    await trx.commit();

    await this.updateCount(termsTaxonomyIds, taxonomy);
    await this.updateTermOrder(objectId, taxonomy.name);

    return true;
  }

  // wp_set_object_terms
  async syncObject(
    objectId: number,
    namesOrTermIds: Array<string | number>,
    taxonomyName: types.TaxonomyName,
    append: boolean = false
  ) {
    const queryUtil = this.components.get(QueryUtil);
    const taxonomy = await this.taxonomyUtil.get(taxonomyName);

    if (taxonomy.isDefault) {
      throw new Error(`Taxonomy Not Found`);
    }

    // Format slugs
    namesOrTermIds = namesOrTermIds
      .map((namesOrTermIds) =>
        typeof namesOrTermIds == "string"
          ? namesOrTermIds.trim()
          : namesOrTermIds
      )
      .filter((term) => (typeof term == "string" ? term.length > 0 : true));

    const oldTermTaxonomyIds: number[] = (
      (await queryUtil.terms((query) => {
        query.withObjectIds([objectId]).where("taxonomy", taxonomyName);
      })) ?? []
    ).map((v) => v.term_taxonomy_id);

    const termTaxonomyIds: number[] = [],
      newTermTaxonomyIds: number[] = [];

    for (const nameOrTermId of namesOrTermIds) {
      const terms = await queryUtil.terms((query) => {
        if (typeof nameOrTermId == "string") {
          query.andWhere((query) =>
            query
              .where("slug", formatting.slug(nameOrTermId))
              .or.where("name", nameOrTermId)
          );
        } else {
          query.where("term_id", nameOrTermId);
        }
        query.where("taxonomy", taxonomyName);
      });

      let termTaxonomyId = 0;

      if (!terms) {
        // Skip if a non-existent term ID is passed.
        if (typeof nameOrTermId == "number") continue;

        // Create a new term since slugOrTermId is a slug
        const newTerm = await this.insert(nameOrTermId, taxonomyName);

        termTaxonomyId = newTerm.term_taxonomy_id;
      } else {
        termTaxonomyId = terms[0].term_taxonomy_id;
      }

      termTaxonomyIds.push(termTaxonomyId);

      // Check if term relationships already exists
      const termRelationships =
        (await queryUtil.terms((query) => {
          query.selectTermRelationships
            .where("object_id", objectId)
            .where("terms_relationships.term_taxonomy_id", termTaxonomyId);
        }, z.array(val.database.wpTermRelationships))) ?? [];

      if (0 < termRelationships.length) {
        continue;
      }

      const trx = await this.database.transaction;
      try {
        await trx
          .insert({
            object_id: objectId,
            term_taxonomy_id: termTaxonomyId,
          })
          .into(this.tables.get("term_relationships"));
      } catch (e) {
        await trx.rollback();
        this.logger.warn(`Failed to insert terms relationships - ${e}`, {
          error: e,
        });
        throw e;
      }
      await trx.commit();

      // Add new taxonomy Id for later comparison
      newTermTaxonomyIds.push(termTaxonomyId);
    }

    if (newTermTaxonomyIds.length > 0) {
      await this.updateCount(newTermTaxonomyIds, taxonomy);
    }

    // If append is false, remove old term relationships
    if (!append) {
      const deleteTermTaxonomyIds = oldTermTaxonomyIds.filter(
        (v) => !termTaxonomyIds.includes(v)
      );

      const deleteTermIds = (
        (await queryUtil.terms((query) => {
          query.selectTermTaxonomy
            .whereIn("term_taxonomy_id", deleteTermTaxonomyIds)
            .where("taxonomy", taxonomyName);
        }, z.array(val.database.wpTermTaxonomy))) ?? []
      ).map((v) => v.term_id) as number[];

      if (0 < deleteTermTaxonomyIds.length) {
        await this.removeObject(objectId, deleteTermIds, taxonomy);
      }

      // Update term_order
      // let termOrder = 0;
      // const dataInsert = (
      //   (await queryUtil.terms((query) => {
      //     query.withObjectIds([objectId]).where("taxonomy", taxonomyName);
      //   })) ?? []
      // ).map((v) => ({
      //   object_id: objectId,
      //   term_taxonomy_id: v.term_taxonomy_id,
      //   term_order: termOrder++,
      // }));

      // if (dataInsert.length > 0) {
      //   const trx = await this.database.transaction;
      //   try {
      //     await trx
      //       .insert(dataInsert)
      //       .into(this.tables.get("term_relationships"))
      //       .onConflict("term_order")
      //       .merge(["term_order"]);
      //   } catch (e) {
      //     await trx.rollback();
      //     throw new Error(`Failed to insert term object - ${e}`);
      //   }
      //   await trx.commit();
      // }

      await this.updateCount(termTaxonomyIds, taxonomy);
    }

    await this.updateTermOrder(objectId, taxonomyName, termTaxonomyIds);
    return termTaxonomyIds;
  }

  // _split_shared_term
  public async splitSharedTerm(
    termId: number,
    termTaxonomyId: number
    //record: boolean = false
  ) {
    const queryUtil = this.components.get(QueryUtil);

    // If there are no shared term_taxonomy rows, there's nothing to do here.
    const sharedCount = (await queryUtil.terms((query) => {
      query.selectTermTaxonomy
        .where("term_id", termId)
        .builder.not.__ref(query)
        .where("term_taxonomy_id", termTaxonomyId)
        .builder.clear("select")
        .count("* as count");
    }, z.array(z.object({ count: z.number() })))) ?? [{ count: 0 }];

    if (0 >= sharedCount[0]["count"]) {
      return termId;
    }

    const checkTermId = await queryUtil.terms((query) => {
      query.selectTermTaxonomy
        .where("term_taxonomy_id", termTaxonomyId)
        .builder.limit(1);
    }, z.array(val.database.wpTermTaxonomy));

    if (checkTermId && checkTermId[0].term_taxonomy_id != termTaxonomyId) {
      return checkTermId[0].term_taxonomy_id;
    }

    // / Pull up data about the currently shared slug, which we'll use to populate the new one.
    const sharedTerm = await this.termUtil.get(termId);

    if (!sharedTerm.props?.term_id) {
      throw new Error(`Term Not Found - ${termId}`);
    }

    const newTermData = {
      name: sharedTerm.props?.name,
      slug: sharedTerm.props.slug,
      term_group: sharedTerm.props.term_group,
    };

    const trx = await this.database.transaction;
    let builder;
    let newTermId: number = 0;

    try {
      await trx
        .insert(newTermData)
        .into(this.tables.get("terms"))
        .then((r) => {
          newTermId = r[0];
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(`Error to Insert - ${e}`);
    }

    if (0 >= newTermId) {
      await trx.rollback();
      throw new Error(`Failed to Insert new Term - ${termId}`);
    }

    try {
      builder = trx
        .table(this.tables.get("term_taxonomy"))
        .where("term_taxonomy_id", termTaxonomyId)
        .update({
          term_id: newTermId,
        });
      await builder;
    } catch (e) {
      await trx.rollback();
      throw new Error(`Error to update Term Taxonomy - ${e}`);
    }

    const termTaxonomy = await queryUtil.terms((query) => {
      query.where("term_taxonomy_id", termTaxonomyId);
    });

    if (!termTaxonomy || !termTaxonomy[0].taxonomy) {
      await trx.rollback();
      throw new Error(`Term Taxonomy not Found - ${termTaxonomyId}`);
    }

    const termTaxonomyName = termTaxonomy[0].taxonomy;

    const childrenTermTaxonomies =
      (await queryUtil.terms((query) => {
        query.selectTermTaxonomy
          .where("parent", termId)
          .where("taxonomy", termTaxonomyName);
      }, z.array(val.database.wpTermTaxonomy))) ?? [];

    for (const termTaxonomy of childrenTermTaxonomies) {
      try {
        builder = trx
          .table(this.tables.get("term_taxonomy"))
          .where("term_taxonomy_id", termTaxonomy.term_taxonomy_id)
          .update({
            parent: newTermId,
          });
        await builder;
      } catch (e) {
        await trx.rollback();
        throw new Error(
          `Failed to update child term taxonomy - ${termTaxonomy.term_id}`
        );
      }
    }
    await trx.commit();
    return newTermId;
  }

  private async syncTermGroup(
    termGroup: number,
    aliasOf: string,
    taxonomyName: types.TaxonomyName
  ) {
    const queryUtil = this.components.get(QueryUtil);

    if (aliasOf.length > 0) {
      const aliasTerms = await queryUtil.terms((query) => {
        query.exists("slug", aliasOf, taxonomyName);
      });

      if (aliasTerms && 0 <= aliasTerms[0].term_group) {
        termGroup = aliasTerms[0].term_group;
      } else if (aliasTerms && aliasTerms[0].term_id) {
        const aliasTermId = aliasTerms[0].term_id;
        const newTermGroup = await queryUtil.terms((query) => {
          query.maxGroup();
        }, val.query.termsGroupMaxCountResult);

        if (!newTermGroup) {
          throw new Error("new Max Group not obtained");
        }
        termGroup = newTermGroup[0]["max"];
        await this.update(aliasTermId, taxonomyName, {
          termGroup,
          name: aliasTerms[0].name,
        });
      }
    }
    return termGroup;
  }

  // wp_insert_term
  async insert(
    name: string,
    taxonomyName: types.TaxonomyName,
    args: Partial<{
      aliasOf: string;
      description: string;
      parentId: number;
      slug: string;
    }> = {}
  ) {
    let { description = "", slug = "" } = args;
    const { aliasOf = "", parentId = 0 } = args;

    const queryUtil = this.components.get(QueryUtil);
    const taxonomy = await this.taxonomyUtil.get(taxonomyName);

    if (taxonomy.isDefault) {
      throw new Error("Invalid Taxonomy");
    }

    name = formatting.unslash(name);
    description = formatting.unslash(description);
    slug = formatting.slug(slug.length > 0 ? slug : `${name}`);

    if (!name || 0 >= name.length) {
      throw new Error(`A name is required for this term.`);
    }

    if (
      parentId > 0 &&
      (!(await this.termUtil.get(parentId)).props ||
        true !== taxonomy.props?.hierarchical)
    ) {
      throw new Error("Invalid Parent Term");
    }

    const data: Partial<z.infer<typeof val.trx.termUpdate>> = {
      name,
      taxonomy: taxonomyName,
      description,
      parent: parentId,
    };

    const dupTerms =
      (await queryUtil.terms((query) => {
        query
          .where("taxonomy", taxonomyName)
          .where("name", name)
          .where("parent", parentId);
      })) ?? [];

    /*
     * The `name` match in `get_terms()` doesn't differentiate accented characters,
     * so we do a stricter comparison here.
     */
    for (const dupTerm of dupTerms) {
      if (
        typeof name === "string" &&
        dupTerm.name?.toLowerCase() === name.toLowerCase()
      ) {
        throw new Error(
          `A term with the name provided already exists in this taxonomy. - ${name}`
        );
      }
    }

    data.term_group = await this.syncTermGroup(0, aliasOf, taxonomyName);

    const term = await this.termUtil.get(0, taxonomy.name);
    term.withProps({
      parent: parentId,
    });

    data.slug = await this.termUtil.getUniqueSlug(slug, term);

    const dataInsert = this.validator.execSafeAny(
      val.trx.termInsert,
      Object.entries(data)
        .map(([key, value]) => ({
          [key]: formatting.unslash(value),
        }))
        .reduce((obj, item) => ({ ...obj, ...item }), {})
    );

    if (!dataInsert) {
      throw new Error(`Invalid Data ${JSON.stringify(data)}`);
    }

    const trx = await this.database.transaction;
    let termId = 0;

    try {
      await trx
        .insert({
          name: dataInsert.name,
          slug: dataInsert.slug,
          term_group: dataInsert.term_group,
        })
        .into(this.tables.get("terms"))
        .then((v) => {
          termId = v[0];
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert term ${e}`);
    }

    // Check if term taxonomy already exists
    const termTaxonomies = await queryUtil.terms((query) => {
      query.where("term_id", termId).where("taxonomy", taxonomyName);
    });

    if (termTaxonomies) {
      return {
        term_id: termId,
        term_taxonomy_id: termTaxonomies[0].term_taxonomy_id,
      };
    }

    let termTaxonomyId = 0;
    try {
      await trx
        .table(this.tables.get("term_taxonomy"))
        .insert({
          term_id: termId,
          taxonomy: dataInsert.taxonomy,
          description: dataInsert.description,
          parent: dataInsert.parent,
        })
        .then((v) => {
          termTaxonomyId = v[0];
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert term taxonomy ${e}`);
    }

    /*
     * Sanity check: if we just created a term with the same parent + taxonomy + slug but a higher term_id than
     * an existing term, then we have unwittingly created a duplicate term. Delete the dupe, and use the term_id
     * and term_taxonomy_id of the older term instead. Then return out of the function so that the "create" hooks
     * are not fired.
     *
     * ok, but why are we doing this just for term?
     */
    const sanityCheck = await queryUtil.terms((query) => {
      query
        .where("slug", slug)
        .where("parent", parentId)
        .where("taxonomy", taxonomyName)
        .where("term_id", termId)
        .builder.not.__ref(query)
        .where("term_taxonomy_id", termTaxonomyId);
    });

    if (sanityCheck && sanityCheck[0].term_id) {
      termId = sanityCheck[0].term_id;
      termTaxonomyId = sanityCheck[0].term_taxonomy_id;
    }

    sanityCheck ? await trx.rollback() : await trx.commit();

    return {
      term_id: termId,
      term_taxonomy_id: termTaxonomyId,
    };
  }

  // wp_update_term
  async update(
    termId: number,
    taxonomyName: types.TaxonomyName,
    args: Partial<{
      aliasOf: string;
      description: string;
      parentId: number;
      slug: string;
      termGroup: number;
      name: string;
    }>
  ) {
    const { aliasOf = "", parentId = 0, termGroup = 0 } = args;
    let { description = "", slug = "", name } = args;

    const queryUtil = this.components.get(QueryUtil);
    const taxonomy = await this.taxonomyUtil.get(taxonomyName);

    if (taxonomy.isDefault) {
      throw new Error("Invalid Taxonomy");
    }

    const term = await this.termUtil.get(termId);

    if (!term.props?.term_id) {
      throw new Error(`Invalid Term - ${termId}`);
    }

    name = name && formatting.unslash(name.length > 0 ? name : term.props.name);
    description = formatting.unslash(description);
    slug = formatting.slug(slug.length > 0 ? slug : `${name}`);

    if (!name || 0 >= name.length) {
      throw new Error(`A name is required for this term.`);
    }

    if (
      parentId > 0 &&
      (!(await this.termUtil.get(parentId)).props ||
        true !== taxonomy.props?.hierarchical)
    ) {
      throw new Error("Invalid Parent Term");
    }

    const data: Partial<z.infer<typeof val.trx.termUpdate>> = {
      name,
      taxonomy: taxonomyName,
      description,
      parent: parentId,
      slug,
    };

    // Check for duplicate slug.
    const dupTerms = await queryUtil.terms((query) => {
      query
        .where("slug", slug)
        .where("taxonomy", taxonomyName)
        .builder.not.__ref(query)
        .where("term_id", termId);
    });

    if (dupTerms) {
      throw new Error(
        `duplicate_term_slug - ${slug} is already in use by another term.`
      );
    }

    const termTaxonomy = await queryUtil.terms((query) => {
      query.where("taxonomy", taxonomyName).where("term_id", termId);
    });

    if (!termTaxonomy) {
      throw new Error(
        `Term Taxonomy not found: taxonomy - ${taxonomy} termId - ${termId}`
      );
    }

    data.term_taxonomy_id = termTaxonomy[0].term_taxonomy_id;

    data.term_group = await this.syncTermGroup(
      termGroup,
      aliasOf,
      taxonomyName
    );

    termId = await this.splitSharedTerm(
      termId,
      termTaxonomy[0].term_taxonomy_id
    );

    data.term_id = termId;

    const dataInsert = this.validator.execSafeAny(
      val.trx.termUpdate,
      Object.entries(data)
        .map(([key, value]) => ({
          [key]: formatting.unslash(value),
        }))
        .reduce((obj, item) => ({ ...obj, ...item }), {})
    );

    if (!dataInsert) {
      throw new Error(`Invalid Data ${JSON.stringify(data)}`);
    }

    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("terms"))
        .where("term_id", dataInsert.term_id)
        .update({
          name: dataInsert.name,
          slug: dataInsert.slug,
          term_group: dataInsert.term_group,
        });
    } catch (e) {
      trx.rollback();
      throw new Error(`Failed to update term ${e}`);
    }

    try {
      await trx
        .table(this.tables.get("term_taxonomy"))
        .where("term_taxonomy_id", dataInsert.term_taxonomy_id)
        .update({
          term_id: dataInsert.term_id,
          taxonomy: dataInsert.taxonomy,
          description: dataInsert.description,
          parent: dataInsert.parent,
        });
    } catch (e) {
      trx.rollback();
      throw new Error(`Failed to update term taxonomy ${e}`);
    }

    await trx.commit();
  }

  // wp_delete_term
  async remove(
    termId: number,
    taxonomyName: types.TaxonomyName,
    args?: Partial<{
      default: number;
      forceDefault: boolean;
    }>
  ) {
    let { default: defaultTermId } = args ?? {};
    const { forceDefault } = args ?? {};

    const taxonomy = await this.taxonomyUtil.get(taxonomyName);

    if (taxonomy.isDefault) {
      throw new Error("Invalid Taxonomy");
    }

    const term = await this.termUtil.get(termId);

    if (!term.props?.term_id) {
      throw new Error(`Invalid Term - ${termId}`);
    }

    const termTaxonomyId = term.props.term_taxonomy_id;
    const options = this.components.get(Options);

    if (taxonomyName === "category") {
      const defaultCategoryId = await options.get<number>("default_category");
      if (defaultCategoryId === termId) {
        return false; // Don't delete the default category.
      }
      defaultTermId = defaultTermId ?? defaultCategoryId;
    }

    // Don't delete the default custom taxonomy term.
    if (taxonomy.props?.default_term) {
      const taxonomyDefaultTermId = await options.get<number>(
        `default_term_${taxonomyName}`
      );
      if (taxonomyDefaultTermId === termId) {
        return false;
      }
      defaultTermId = taxonomyDefaultTermId ?? defaultTermId;
    }

    if (defaultTermId) {
      const defaultTerm = await this.termUtil.get(defaultTermId, taxonomyName);
      if (!defaultTerm.props) {
        defaultTermId = undefined;
      }
    }

    // Update children to point to new parent.
    if (taxonomy.props?.hierarchical) {
      const trx = await this.database.transaction;
      try {
        await trx
          .table(this.tables.get("term_taxonomy"))
          .where("parent", term.props.term_id)
          .where("taxonomy", taxonomyName)
          .update({
            parent: term.props.parent,
          });
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to update term taxonomy ${e}`);
      }
      await trx.commit();
    }

    const queryUtil = this.components.get(QueryUtil);
    const objectIds = (
      (await queryUtil.terms((query) => {
        query.selectTermRelationships.where(
          "terms_relationships.term_taxonomy_id",
          termTaxonomyId
        );
      }, val.query.termRelationshipsResult)) ?? []
    ).map((term) => term.object_id);

    for (const objectId of objectIds) {
      if (!defaultTermId) {
        await this.removeObject(objectId, [termId], taxonomy);
        continue;
      }

      const terms =
        (await queryUtil.terms((query) => {
          query.withObjectIds([objectId]).where("taxonomy", taxonomyName);
        })) ?? [];

      if (1 >= terms.length && defaultTermId) {
        // - object has only one term that's being deleted.
        // - attach default term to the object
        await this.syncObject(objectId, [defaultTermId], taxonomyName);
        continue;
      }

      const termIds = terms
        .filter((term) => term.term_id !== termId)
        .map((term) => term.term_id);

      if (defaultTermId && forceDefault) {
        termIds.push(defaultTermId);
      }

      await this.syncObject(objectId, termIds, taxonomyName);
    }

    const metas =
      (await queryUtil.meta("term", (query) => {
        query.withIds([termId]);
      })) ?? [];

    const metaTrx = this.components.get(MetaTrx);
    for (const meta of metas) {
      if (!meta.meta_key) continue;
      await metaTrx.remove("term", {
        objectId: termId,
        key: meta.meta_key,
      });
    }

    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("term_taxonomy"))
        .where("term_taxonomy_id", termTaxonomyId)
        .del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to delete term taxonomy ${e}`);
    }
    await trx.commit();

    // Delete the term if no taxonomies use it.
    if (
      !(await queryUtil.terms((query) => {
        query.selectTermTaxonomy.where("term_taxonomy_id", termId);
      }))
    ) {
      const trx = await this.database.transaction;
      try {
        await trx
          .table(this.tables.get("terms"))
          .where("term_id", termId)
          .del();
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to delete term  ${e}`);
      }
      await trx.commit();
    }

    return true;
  }
}
