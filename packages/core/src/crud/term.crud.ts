import { z } from "zod";

import { Config } from "../config";
import { Components } from "../core/components";
import { Term } from "../core/term";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { TaxonomyUtil } from "../core/utils/taxonomy.util";
import { TermUtil } from "../core/utils/term.util";
import { component } from "../decorators/component";
import { TermsQuery } from "../query-builder";
import { TermTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

import type * as types from "../types";

type DataType<T extends "view" | "edit" | "embed"> = T extends "edit"
  ? Term["props"] & {
      children: Awaited<ReturnType<Term["children"]>>;
      metas: Record<string, any>;
    }
  : {
      term_id: number;
      count: number;
      description: string;
      name: string;
      slug: string;
      parent: number;
      taxonomy: types.TaxonomyName;
    };

@component()
export class TermCrud extends Crud {
  constructor(components: Components, private config: Config) {
    super(components);
  }

  async get<T extends "view" | "edit" | "embed">(
    termId: number,
    options?: Partial<{
      context: T;
      taxonomyName: types.TaxonomyName;
    }>
  ) {
    const { context = "view", taxonomyName } = options ?? {};

    const { user } = await this.getUser();
    const termUtil = this.components.get(TermUtil);

    const term = await termUtil.get(termId, taxonomyName);

    if (!term.props?.term_id || 0 >= term.props.term_id) {
      throw new Error("Term not found");
    }

    if (context === "edit" && !(await user.can("edit_term", termId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this term"
      );
    }

    let data = {};
    if (context == "edit") {
      data = {
        ...term.props,
        children: await term.children(),
        metas: await term.meta.props(),
      };
    } else {
      data = {
        term_id: term.props.term_id,
        count: term.props.count,
        description: term.props.description,
        name: term.props.name,
        slug: term.props.slug,
        parent: term.props.parent,
        taxonomy: term.taxonomyName,
      };
    }

    return this.returnValue(data as DataType<T>);
  }

  async update(
    termId: number,
    taxonomyName: types.TaxonomyName,
    data: {
      name?: string;
      parent?: number;
      slug?: string;
      description?: string;
    }
  ) {
    const { name, parent: parentId, slug, description } = data;

    if (!name && !parent && !slug) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Nothing to update");
    }

    const term = (await this.get(termId, { context: "edit", taxonomyName }))
      .data;
    const termTrx = this.components.get(TermTrx);

    await termTrx.update(term.term_id, taxonomyName, {
      parentId,
      slug,
      name,
      description,
    });

    return this.returnValue(true);
  }

  private async canCreateTerm(taxonomyName: types.TaxonomyName) {
    const { user } = await this.getUser();
    const taxonomyUtil = this.components.get(TaxonomyUtil);
    const taxonomy = await taxonomyUtil.get(taxonomyName);
    const isHierarchical = taxonomy.props?.hierarchical;

    if (
      (isHierarchical &&
        !(await user.can(taxonomy.props?.capabilities?.["edit_terms"]))) ||
      (!isHierarchical &&
        !(await user.can(taxonomy.props?.capabilities?.["assign_terms"])))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to create terms in this taxonomy"
      );
    }
  }

  async create(data: {
    name: string;
    taxonomyName: types.TaxonomyName;
    parent?: number;
    slug?: string;
    description?: string;
  }) {
    const { name, taxonomyName, parent: parentId, slug, description } = data;
    await this.canCreateTerm(taxonomyName);

    const termTrx = this.components.get(TermTrx);
    return this.returnValue(
      await termTrx.insert(name, taxonomyName, {
        parentId,
        slug,
        description,
      })
    );
  }

  async syncObject(
    objectId: number,
    namesOrTermIds: Array<string | number>,
    taxonomyName: types.TaxonomyName,
    append: boolean = false
  ) {
    await this.canCreateTerm(taxonomyName);

    const termTrx = this.components.get(TermTrx);
    return this.returnValue(
      await termTrx.syncObject(objectId, namesOrTermIds, taxonomyName, append)
    );
  }

  async delete(termId: number, taxonomyName: types.TaxonomyName) {
    const { user } = await this.getUser();

    if (!(await user.can("delete_term", termId))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to delete this term"
      );
    }

    const termTrx = this.components.get(TermTrx);
    return this.returnValue(await termTrx.remove(termId, taxonomyName));
  }

  async taxonomies() {
    const { user } = await this.getUser();
    const role = await user.role();

    if (role.is("anonymous")) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const taxonomies = this.config.config.taxonomy.settings;
    const data = [];

    for (const entry of Object.entries(taxonomies)) {
      const [name, taxonomy] = entry as [
        types.TaxonomyName,
        types.TaxonomyRecord[types.TaxonomyName]
      ];
      if (!taxonomy.showUi) {
        continue;
      }

      data.push({
        name,
        hierarchical: taxonomy.hierarchical,
        capabilities: taxonomy.capabilities,
      });
    }

    return this.returnValue(data);
  }

  async list<T extends "view" | "edit" | "embed">(
    taxonomyName: types.TaxonomyName,
    args?: Partial<z.infer<typeof val.crud.termListParams>>,
    options?: { context?: T }
  ) {
    const { context = "view" } = options ?? {};

    const queryUtil = this.components.get(QueryUtil);
    const termUtil = this.components.get(TermUtil);
    const taxonomyUtil = this.components.get(TaxonomyUtil);
    const parsedArgs = val.crud.termListParams.parse(args ?? {});

    const { user } = await this.getUser();

    const taxonomy = await taxonomyUtil.get(taxonomyName);

    if (
      context === "edit" &&
      !(await user.can(taxonomy.props?.capabilities?.["edit_terms"]))
    ) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to edit this term"
      );
    }

    if (parsedArgs.post) {
      const postUtil = this.components.get(PostUtil);
      const post = await postUtil.get(parsedArgs.post);

      if (!post.props?.ID || 0 >= post.props.ID) {
        throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid post ID");
      }

      if (taxonomy.props?.objectType !== post.props.post_type) {
        throw new CrudError(
          StatusMessage.BAD_REQUEST,
          "post isn't associated with this taxonomy"
        );
      }

      if (
        !(await postUtil.isPubliclyViewable(post)) &&
        !(await user.can("read_post", post.props.ID))
      ) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          "Sorry, you are not allowed to view terms for this post"
        );
      }
    }

    if (parsedArgs.orderby == "term_order" && !parsedArgs.post) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "term_order can only be used with post"
      );
    }

    const buildQuery = (query: TermsQuery) => {
      const { column } = query.alias;
      const offset = (parsedArgs.page - 1) * parsedArgs.per_page;
      const limit = parsedArgs.per_page;

      query.where("taxonomy", taxonomyName);

      query.builder
        .offset(offset)
        .limit(limit)
        .groupBy(column("terms", "term_id"));

      if (parsedArgs.orderby) {
        query.builder.orderBy(
          parsedArgs.orderby == "description"
            ? column("term_taxonomy", parsedArgs.orderby)
            : parsedArgs.orderby == "term_order"
            ? column("term_relationships", parsedArgs.orderby)
            : column("terms", parsedArgs.orderby),
          parsedArgs.order
        );
      }

      if (Array.isArray(parsedArgs.include)) {
        query.whereIn("term_id", parsedArgs.include);
      }

      if (Array.isArray(parsedArgs.exclude)) {
        query.andWhereNot((query) =>
          query.whereIn("term_id", parsedArgs.exclude as number[])
        );
      }

      if (parsedArgs.slug) {
        query.where("slug", parsedArgs.slug);
      }

      if (parsedArgs.hide_empty) {
        query.where("count", 0, ">");
      }

      if (parsedArgs.parent && taxonomy.props?.hierarchical) {
        query.where("parent", parsedArgs.parent);
      }

      if (parsedArgs.post) {
        query.withObjectIds([parsedArgs.post]);
      }

      if (parsedArgs.search) {
        query.andWhere((query) => {
          const searchColumns = ["slug", "name"] as const;
          for (const searchColumn of searchColumns) {
            parsedArgs.search &&
              query.or.whereLike(searchColumn, parsedArgs.search);
          }
        });
      }
    };

    const terms =
      (await queryUtil.terms((query) => {
        buildQuery(query);
      })) ?? [];

    const counts = await queryUtil.terms((query) => {
      buildQuery(query);
      query.count("terms", "term_id");
    }, val.query.resultCount);

    const data = [];
    for (const term of await termUtil.toTerms(terms)) {
      const props = term.props;
      if (!props) continue;

      if (context == "edit") {
        data.push({
          ...props,
          metas: await term.meta.props(),
        });
      } else {
        data.push({
          term_id: props.term_id,
          count: props.count,
          description: props.description,
          name: props.name,
          slug: props.slug,
          parent: props.parent,
          taxonomy: taxonomyName,
        });
      }
    }

    const pagination = this.pagination({
      page: parsedArgs.page,
      limit: parsedArgs.per_page,
      count: counts?.count ?? 0,
    });

    return this.returnValue(data as Array<DataType<T>>, {
      pagination,
      context,
    });
  }
}
