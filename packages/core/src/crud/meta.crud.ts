import { z } from "zod";

import { formatting } from "../common";
import { diffObject } from "../common/diff";
import { Config } from "../config";
import { Components } from "../core/components";
import { Logger } from "../core/logger";
import { MetaUtil } from "../core/utils/meta.util";
import { QueryUtil } from "../core/utils/query.util";
import { component } from "../decorators/component";
import { MetaTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

import type * as types from "../types";
import { MetaQuery } from "../query-builder";
type Data = Exclude<
  z.infer<typeof val.trx.postUpsert.shape.meta_input>,
  undefined
>;

@component()
export class MetaCrud extends Crud {
  constructor(
    components: Components,
    private config: Config,
    private logger: Logger
  ) {
    super(components);
  }

  private async hasObject(table: types.MetaTable, objectId: number) {
    const queryUtil = this.components.get(QueryUtil);
    switch (table) {
      case "blog":
        return (
          typeof (await queryUtil.blogs((query) => {
            query.where("blog_id", objectId);
          })) !== "undefined"
        );
      case "comment":
        return (
          typeof (await queryUtil.comments((query) => {
            query.where("ID", objectId);
          })) !== "undefined"
        );
      case "post":
        return (
          typeof (await queryUtil.posts((query) => {
            query.where("ID", objectId);
          })) !== "undefined"
        );
      case "site":
        return (
          typeof (await queryUtil.sites((query) => {
            query.where("id", objectId);
          })) !== "undefined"
        );
      case "term":
        return (
          typeof (await queryUtil.terms((query) => {
            query.where("term_id", objectId);
          })) !== "undefined"
        );
      case "user":
        return (
          typeof (await queryUtil.users((query) => {
            query.where("ID", objectId);
          })) !== "undefined"
        );
      default:
        return false;
    }
  }

  private async sync(
    table: types.MetaTable,
    objectId: number,
    data: Data,
    mode: "update" | "create" | "sync"
  ) {
    if (!(await this.hasObject(table, objectId))) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `object not found - ${objectId}`
      );
    }

    if (typeof data === "undefined") {
      return;
    }

    const { user } = await this.getUser();

    const currentMetas = (await this.get(table, objectId)).data ?? {};
    const diffFormData = diffObject(data, currentMetas) as Record<string, any>;

    if (!diffFormData) {
      return;
    }

    const metaTrx = this.components.get(MetaTrx);

    const metaUtil = this.components.get(MetaUtil);
    const metaKeys = Object.keys(formatting.primitive(diffFormData) as object);

    for (const metaKey of metaKeys) {
      if (metaUtil.isProtected(metaKey, table)) {
        this.logger.info(`Protected meta key ${metaKey}`, { metaKey });
        continue;
      }

      // Update
      if (
        (mode == "sync" && data[metaKey]) ||
        (mode == "update" &&
          currentMetas &&
          currentMetas[metaKey] &&
          data[metaKey] &&
          currentMetas[metaKey] !== data[metaKey])
      ) {
        if (!(await user.can(`edit_${table}_meta`, objectId, metaKey))) {
          throw new CrudError(
            StatusMessage.UNAUTHORIZED,
            `Sorry, you are not allowed to edit the ${table} custom field - ${metaKey}`
          );
        }
        await metaTrx.upsert(table, objectId, metaKey, data[metaKey]);

        // Create
      } else if (
        mode == "create" &&
        (!currentMetas || !currentMetas[metaKey])
      ) {
        if (!(await user.can(`add_${table}_meta`, objectId, metaKey))) {
          throw new CrudError(
            StatusMessage.UNAUTHORIZED,
            `Sorry, you are not allowed to create the ${table} custom field`
          );
        }

        await metaTrx.upsert(table, objectId, metaKey, data[metaKey]);
        // Delete
      } else if (mode == "sync" && !data[metaKey]) {
        if (!(await user.can(`delete_${table}_meta`, objectId, metaKey))) {
          throw new CrudError(
            StatusMessage.UNAUTHORIZED,
            `Sorry, you are not allowed to delete the ${table} custom field`
          );
        }
        await metaTrx.remove(table, {
          key: metaKey,
          objectId,
        });
      }
    }
  }

  async get(table: types.MetaTable, objectId: number, keys?: string[]) {
    const queryUtil = this.components.get(QueryUtil);

    const metas = await queryUtil.meta(table, (query) => {
      query.withIds([objectId]);
      if (keys) {
        query.withKeys(keys);
      }
    });

    if (!metas) {
      return this.returnValue({} as Record<string, any>);
    }

    return this.returnValue(
      metas.reduce(
        (a, v) => ({
          ...a,
          [`${v.meta_key}`]: formatting.primitive(v.meta_value),
        }),
        {}
      ) as Record<string, any>
    );
  }

  async create(table: types.MetaTable, objectId: number, data: Data) {
    await this.sync(table, objectId, data, "create");
    return this.returnValue(objectId);
  }

  async update(
    table: types.MetaTable,
    objectId: number,
    data: Data,
    mode: "update" | "sync" = "update"
  ) {
    await this.sync(table, objectId, data, mode);
    return this.returnValue(true, objectId);
  }

  async delete(table: types.MetaTable, objectId: number, metaKeys: string[]) {
    if (!(await this.hasObject(table, objectId))) {
      throw new CrudError(
        StatusMessage.NOT_FOUND,
        `object not found - ${objectId}`
      );
    }

    const { user } = await this.getUser();
    const metaTrx = this.components.get(MetaTrx);

    for (const metaKey of metaKeys) {
      if (!(await user.can(`delete_${table}_meta`, objectId, metaKey))) {
        throw new CrudError(
          StatusMessage.UNAUTHORIZED,
          `Sorry, you are not allowed to delete the ${table} custom field`
        );
      }

      await metaTrx.remove(table, {
        key: metaKey,
        objectId,
      });
    }

    return this.returnValue(objectId);
  }

  async list(
    table: types.MetaTable,
    args?: Partial<z.infer<typeof val.crud.metaListParams>>,
    options?: {
      unserialize?: boolean;
    }
  ) {
    const { user } = await this.getUser();
    const role = await user.role();

    // Only admin or superadmin is permitted to list all metas
    if (
      (this.config.isMultiSite() && !role.isSuperAdmin()) ||
      !role.isAdmin()
    ) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const queryUtil = this.components.get(QueryUtil);
    const parsedArgs = val.crud.metaListParams.parse(args ?? {});

    const buildQuery = (table: types.MetaTable, query: MetaQuery) => {
      const { column } = query.alias;
      const offset = (parsedArgs.page - 1) * parsedArgs.per_page;
      const limit = parsedArgs.per_page;

      query.builder.offset(offset).limit(limit);

      if (parsedArgs.orderby) {
        query.builder.orderBy(
          column(
            `${table}meta`,
            parsedArgs.orderby === "meta_id" && table === "user"
              ? "umeta_id"
              : parsedArgs.orderby
          ),
          parsedArgs.order
        );
      }

      if (Array.isArray(parsedArgs.include)) {
        query.withIds(parsedArgs.include);
      }

      if (Array.isArray(parsedArgs.exclude)) {
        query.withIds(parsedArgs.exclude as number[], {
          not: true,
        });
      }

      if (parsedArgs.search) {
        query.whereKeyLike(parsedArgs.search as string);
      }
    };

    const metas = await queryUtil.meta(table, (query) => {
      query.setPrimaryTable(table).joinPrimary();
      buildQuery(table, query);
    });

    if (!metas) {
      return this.returnValue([]);
    }

    return this.returnValue(
      !options?.unserialize
        ? metas
        : metas.map((meta) => {
            return {
              ...meta,
              meta_value: formatting.primitive(meta.meta_value),
            };
          })
    );
  }
}
