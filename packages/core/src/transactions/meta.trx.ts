import { formatting, phpSerialize } from "../common";
import { Components } from "../core/components";
import { QueryUtil } from "../core/utils/query.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { Trx } from "./trx";

import type * as types from "../types";
type RemoveParams = { key: string; value?: string } & (
  | {
      objectId: number;
      deleteAll?: false;
    }
  | {
      deleteAll: true;
      objectId?: undefined;
    }
);

@transactions()
export class MetaTrx extends Trx {
  constructor(
    private database: Database,
    private components: Components,
    private validator: Validator
  ) {
    super(components);
  }

  async bulkUpsertObject(
    table: types.MetaTable,
    objectId: number,
    data: Record<string, any>
  ) {
    for (const [key, value] of Object.entries(data)) {
      await this.upsert(table, objectId, key, value, {
        serialize: typeof value === "object" || Array.isArray(value),
      });
    }
  }

  async removeObject(table: types.MetaTable, objectId: number) {
    const metaTable = this.tables.get(`${table}meta`);
    const column = `${table}_id`;

    const trx = await this.database.transaction;
    try {
      await trx.table(metaTable).where(column, objectId).del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to delete - ${e}`);
    }
    await trx.commit();
    return true;
  }

  async remove(table: types.MetaTable, args: RemoveParams) {
    const { value, objectId, deleteAll } = args;
    let { key } = args;
    const queryUtil = this.components.get(QueryUtil);
    const metaTable = this.tables.get(`${table}meta`);

    const metaColumn = table == "user" ? "umeta_id" : "meta_id";

    key = formatting.unslash(key);

    const metaIds = (
      (await queryUtil.meta(table, (query) => {
        if (!deleteAll && objectId) {
          query.withIds([objectId]);
        }
        value ? query.where(key, value) : query.withKeys([key]);
      })) ?? []
    ).map((v: any) => (table == "user" ? v.umeta_id : v.meta_id));

    if (0 >= metaIds.length) {
      return false;
    }

    const trx = await this.database.transaction;
    try {
      await trx.table(metaTable).whereIn(metaColumn, metaIds).del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to delete - ${e}`);
    }
    await trx.commit();
    return true;
  }

  async upsert(
    table: types.MetaTable,
    objectId: number,
    key: string,
    value: any,
    args?: {
      unique?: boolean;
      serialize?: boolean;
    }
  ) {
    const { unique = true, serialize = false } = args || {};

    const queryUtil = this.components.get(QueryUtil);

    const metaTable = this.tables.get(`${table}meta`);
    const column = formatting.key(`${table}_id`);

    key = formatting.unslash(key);

    if (serialize) {
      value = phpSerialize(value);
    } else if (typeof value === "boolean") {
      value = true === value ? "1" : "0";
    } else if (typeof value == "undefined") {
      value = "";
    } else {
      value = formatting.unslash(value);
    }

    // Compare existing value to new value if unique = true and the key exists only once.
    if (unique) {
      const oldMeta = await queryUtil.meta(table, (query) => {
        query.withIds([objectId]).withKeys([key]);
      });

      if (oldMeta && 1 === oldMeta.length && oldMeta[0].meta_value === value) {
        return false;
      }
    }

    const metaIds = (
      (await queryUtil.meta(table, (query) => {
        query.withIds([objectId]).withKeys([key]);
      })) ?? []
    ).map((v: any) => (table === "user" ? v.umeta_id : v.meta_id));

    if (0 >= metaIds.length) {
      const dataInsert = this.validator.execSafeAny(val.trx.metaInsert(table), {
        [column]: objectId,
        meta_key: key,
        meta_value: value,
      });

      if (!dataInsert) {
        throw new Error(
          `Invalid Data ${JSON.stringify({
            [column]: objectId,
            meta_key: key,
            meta_value: value,
          })}`
        );
      }

      const trx = await this.database.transaction;
      try {
        await trx.insert(dataInsert).into(metaTable);
      } catch (e) {
        await trx.rollback();
        throw new Error(`Failed to insert ${e}`);
      }
      await trx.commit();
      return true;
    }

    const dataUpdate = this.validator.execSafeAny(val.trx.metaUpdate, {
      meta_value: value,
    });

    if (!dataUpdate) {
      throw new Error(`Invalid Data - ${value}`);
    }

    const trx = await this.database.transaction;
    try {
      await trx
        .table(metaTable)
        .where(column, objectId)
        .where("meta_key", key)
        .update(dataUpdate);
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to update ${e}`);
    }
    await trx.commit();
    return true;
  }
}
