import { z } from "zod";

import { formatting } from "../common";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Logger } from "../core/logger";
import { Options } from "../core/options";
import { QueryUtil } from "../core/utils/query.util";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { TermTrx } from "./term.trx";
import { Trx } from "./trx";

type DataUpsert = z.infer<typeof val.trx.linkUpsert>;

@transactions()
export class LinkTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private validator: Validator
  ) {
    super(components);
  }

  private async defaultCategory() {
    const options = this.components.get(Options);
    const defaultLinkCategory = await options.get<number>(
      "default_link_category"
    );
    return defaultLinkCategory ? [defaultLinkCategory] : [];
  }

  // part of remove_user_from_blog
  async changeUser(fromUserId: number, toUserId: number) {
    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("links"))
        .where("link_owner", fromUserId)
        .update({
          link_owner: toUserId,
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(
        `Failed to change user from: ${fromUserId} to: ${toUserId}`
      );
    }
    await trx.commit();
    return true;
  }

  // wp_delete_link
  async remove(linkId: number) {
    const termTrx = this.components.get(TermTrx);
    const current = this.components.get(Current);
    const trx = await this.database.transaction;
    try {
      await trx
        .table(current.tables.get("links"))
        .where("link_id", linkId)
        .del();
    } catch (e) {
      trx.rollback();
      throw new Error(`Failed to remove link - ${e}`);
    }
    await trx.commit();

    // Remove terms
    await termTrx.removeObjectTermRelationships(linkId, ["link_category"]);
  }

  // wp_insert_link
  // wp_update_link
  async upsert(input: Partial<DataUpsert>) {
    const queryUtil = this.components.get(QueryUtil);

    let update = false;
    let linkBefore: z.infer<typeof val.database.wpLinks> | undefined =
      undefined;

    let linkId = 0;
    if (input.link_id && 0 < input.link_id) {
      linkId = input.link_id;
      update = true;
      linkBefore = await queryUtil.common(
        "links",
        (query) => {
          query.where("link_id", linkId).builder.first();
        },
        val.database.wpLinks
      );

      if (!linkBefore) {
        throw new Error(`Link not found - ${input.link_id}`);
      }

      input = {
        ...(linkBefore as any),
        ...input,
      };
    }

    const parsedInput = val.trx.linkUpsert.parse(input);

    if (0 >= parsedInput.link_url.length) {
      return 0;
    }

    if (0 >= parsedInput.link_name.length) {
      parsedInput.link_name = parsedInput.link_url;
    }

    // Make sure we set a valid category.
    if (!parsedInput.link_category) {
      parsedInput.link_category = await this.defaultCategory();
    }

    let dataUpsert: any = {};

    try {
      dataUpsert = this.validator.execAny(
        update ? val.trx.linkUpdate : val.trx.linkInsert,
        Object.entries(parsedInput)
          .map(([key, value]) => ({
            [key]: formatting.unslash(value),
          }))
          .reduce((obj, item) => ({ ...obj, ...item }), {})
      );
    } catch (e) {
      this.logger.info(`parse error: ${e}`, { parsedInput });
      throw e;
    }

    if (!dataUpsert) {
      throw new Error(`Invalid post data - ${JSON.stringify(parsedInput)}`);
    }

    if (!linkId) linkId = parsedInput.link_id ?? 0;

    const trx = await this.database.transaction;
    try {
      if (update) {
        await trx
          .table(this.tables.get("links"))
          .where("link_id", parsedInput.link_id)
          .update(dataUpsert);
      } else {
        await trx
          .insert(dataUpsert)
          .into(this.tables.get("links"))
          .then((v) => {
            linkId = v[0];
          });
      }
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert link - ${e}`);
    }
    await trx.commit();

    await this.updateCategory(linkId, parsedInput.link_category);
    return linkId;
  }

  // wp_set_link_cats
  async updateCategory(linkId: number = 0, linkCategory: number[] = []) {
    if (0 >= linkCategory.length) {
      linkCategory = await this.defaultCategory();
    }

    const linkCategories = Array.from(new Set(linkCategory));
    const termTrx = this.components.get(TermTrx);

    if (linkCategories.length > 0) {
      await termTrx.syncObject(linkId, linkCategories, "link_category");
    }
  }
}
