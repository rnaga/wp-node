import { z } from "zod";

import { Components } from "../core/components";
import { PostUtil } from "../core/utils/post.util";
import { QueryUtil } from "../core/utils/query.util";
import { component } from "../decorators/component";
import { PostsQuery } from "../query-builder/posts.query";
import { RevisionTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

@component()
export class RevisionCrud extends Crud {
  constructor(components: Components) {
    super(components);
  }

  private async checkPermission(parentId: number) {
    const { user } = await this.getUser();

    const postUtil = this.components.get(PostUtil);
    const parent = await postUtil.get(parentId);

    if (!parent.props) {
      throw new CrudError(StatusMessage.BAD_REQUEST, "Invalid parameters.");
    }

    if (!(await user.can("edit_post", parent.props.ID))) {
      throw new CrudError(
        StatusMessage.UNAUTHORIZED,
        "Sorry, you are not allowed to view revisions of this post"
      );
    }

    return true;
  }

  async get(parentId: number, id: number) {
    await this.checkPermission(parentId);

    const postUtil = this.components.get(PostUtil);
    const revision = await postUtil.get(id);

    if (!revision.props || revision.props.post_parent !== parentId) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `The revision does not belong to the specified parent with id of ${parentId}`
      );
    }

    return this.returnValue(revision.props);
  }

  async restore(parentId: number, id: number) {
    await this.checkPermission(parentId);

    const postUtil = this.components.get(PostUtil);
    const revision = await postUtil.get(id);
    const parent = await postUtil.get(parentId);

    if (
      !revision.props ||
      revision.props.post_parent !== parentId ||
      !parent.props
    ) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `The revision does not belong to the specified parent with id of ${parentId}`
      );
    }

    const postType = postUtil.getTypeObject(parent.props.post_type);
    if (!postType?.supports.includes("revisions")) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `The item doesn't support revision ${parentId}`
      );
    }

    const revisionTrx = this.components.get(RevisionTrx);
    const result = await revisionTrx.restore(id);

    if (result === parentId) {
      await revisionTrx.save(parentId);
      return this.returnValue(true);
    }

    return this.returnValue(false);
  }

  async list(
    parentId: number,
    args: Partial<z.infer<typeof val.crud.revisionListParams>>
  ) {
    await this.checkPermission(parentId);

    const queryUtil = this.components.get(QueryUtil);
    const parsedArgs = val.crud.revisionListParams.parse(args ?? {});

    const buildQuery = (query: PostsQuery) => {
      const { column } = query.alias;
      const offset =
        parsedArgs.offset ?? (parsedArgs.page - 1) * parsedArgs.per_page;
      const limit = parsedArgs.per_page;

      query.builder.offset(offset).limit(limit).groupBy(column("posts", "ID"));

      query.where("post_parent", parentId).where("post_type", "revision");

      if (parsedArgs.orderby) {
        query.builder.orderBy(
          column("posts", parsedArgs.orderby),
          parsedArgs.order
        );
      }

      if (Array.isArray(parsedArgs.include)) {
        query.whereIn("ID", parsedArgs.include);
      }

      if (Array.isArray(parsedArgs.exclude)) {
        query.not.andWhere((query) =>
          query.whereIn("ID", parsedArgs.exclude as number[])
        );
      }

      if (parsedArgs.search) {
        query.andWhere((query) => {
          const searchColumns = [
            "post_title",
            "post_excerpt",
            "post_content",
          ] as const;
          for (const searchColumn of searchColumns) {
            parsedArgs.search &&
              query.or.whereLike(searchColumn, parsedArgs.search);
          }
        });
      }
    };

    const revisions =
      (await queryUtil.posts((query) => {
        buildQuery(query);
      })) ?? [];

    const counts = await queryUtil.posts((query) => {
      buildQuery(query);
      query.count("posts", "ID");
    }, val.query.resultCount);

    const pagination = this.pagination({
      page: parsedArgs.page,
      limit: parsedArgs.per_page,
      count: counts?.count ?? 0,
    });

    return this.returnValue(revisions, {
      pagination,
    });
  }
}
