import { z } from "zod";

import { formatting } from "../common";
import { Components } from "../core/components";
import { Logger } from "../core/logger";
import { QueryUtil } from "../core/utils/query.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { MetaTrx } from "./meta.trx";
import { Trx } from "./trx";

type DataUpsert = z.infer<typeof val.trx.siteUpsert>;

@transactions()
export class SiteTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private validator: Validator
  ) {
    super(components);
  }

  async remove(siteId: number) {
    const trx = await this.database.transaction;

    try {
      await trx.table(this.tables.get("site")).where("id", siteId).del();
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to remove site - ${e}`);
    }
    await trx.commit();

    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.removeObject("site", siteId);

    return true;
  }

  async insert(
    input: Partial<DataUpsert>,
    options?: {
      upsert: boolean;
    }
  ) {
    const { upsert = true } = options ?? {};
    const queryUtil = this.components.get(QueryUtil);

    if (input.id && 0 < input.id) {
      const siteBefore = await queryUtil.sites((query) => {
        query.where("id", input.id as number).builder.first();
      }, val.database.wpSite);

      if (!siteBefore) {
        throw new Error(`Site not found - ${input.id}`);
      }

      input = {
        ...siteBefore,
        ...input,
      };
    }

    const parsedInput = val.trx.siteUpsert.parse(input);

    let dataInsert: any = {};
    try {
      dataInsert = this.validator.execAny(
        val.trx.siteInsert,
        Object.entries(parsedInput)
          .map(([key, value]) => ({
            [key]: formatting.unslash(value),
          }))
          .reduce((obj, item) => ({ ...obj, ...item }), {})
      );
    } catch (e) {
      this.logger.warn(`parse error: ${e}`, { parsedInput });
      throw e;
    }

    if (!dataInsert) {
      throw new Error(`Invalid post data - ${JSON.stringify(parsedInput)}`);
    }

    let siteId = parsedInput.id ?? 0;
    const trx = await this.database.transaction;
    try {
      if (upsert) {
        await trx
          .insert(dataInsert)
          .into(this.tables.get("site"))
          .onConflict("id")
          .merge(["domain", "path"])
          .then((r) => {
            if (r?.[0] > 0) {
              siteId = r[0];
            }
          });
      } else {
        await trx
          .insert(dataInsert)
          .into(this.tables.get("site"))
          .onConflict("id")
          .ignore()
          .then((r) => {
            if (r?.[0] > 0) {
              siteId = r[0];
            }
          });
      }
    } catch (e) {
      await trx.rollback();
      this.logger.warn(`Error: ${e}`, { error: e });
      //throw e;
    }
    await trx.commit();

    if (0 >= siteId) {
      throw new Error(`Invalid siteId`);
    }

    if (parsedInput.meta_input) {
      const metaTrx = this.components.get(MetaTrx);
      await metaTrx.bulkUpsertObject("site", siteId, parsedInput.meta_input);
    }

    return siteId;
  }
}
