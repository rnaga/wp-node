import { phpSerialize } from "../common";
import { Config } from "../config";
import { Components } from "../core/components";
import { Logger } from "../core/logger";
import { Validator } from "../core/validator";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { Trx } from "./trx";

import type * as types from "../types";
@transactions()
export class OptionsTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private config: Config,
    private validator: Validator
  ) {
    super(components);
  }

  async update(
    key: types.DefaultOptionNames,
    value: any,
    autoload?: "yes" | "no"
  ): Promise<boolean>;
  async update(
    key: string,
    value: string,
    autoload?: "yes" | "no"
  ): Promise<boolean>;
  async update(key: any, value: any, autoload: "yes" | "no" = "no") {
    if (this.config.config.options.protected.includes(key)) {
      throw new Error(`Protected Option - ${key}`);
    }

    let success = true;

    if (val.options.shape[key as types.DefaultOptionNames]) {
      try {
        value = val.options.shape[key as types.DefaultOptionNames].parse(value);
      } catch (e) {
        this.logger.error(`Error parsing value for key ${key}: ${e}`);
        throw new Error(`Invalid value for option ${key}`);
      }
    }

    try {
      const data = this.validator.exec(
        val.database.wpOptions.omit({ option_id: true }),
        {
          option_name: key,
          option_value: `${value}`,
          autoload,
        }
      );

      const trx = await this.database.transaction;
      await trx
        .table(this.tables.get("options"))
        .where("option_name", data.option_name)
        .update({
          option_value: data.option_value,
          autoload: data.autoload,
        })
        .then(() => {
          trx.commit();
        })
        .catch((e) => {
          this.logger.warn(`Error: ${e}`);
          success = false;
          trx.rollback();
        });
    } catch (e) {
      this.logger.warn(`${e}`);
      success = false;
    }

    return success;
  }

  async insert(
    key: types.DefaultOptionNames,
    value: string | number | object | boolean,
    options?: {
      autoload?: "yes" | "no";
      upsert?: boolean;
      seriazlie?: boolean;
      force?: boolean;
    }
  ): Promise<number>;
  async insert(
    key: string,
    value: string | number | object | boolean,
    options?: {
      autoload?: "yes" | "no";
      upsert?: boolean;
      seriazlie?: boolean;
      force?: boolean;
    }
  ): Promise<number>;
  async insert(
    key: any,
    value: string | number | object | boolean,
    options?: {
      autoload?: "yes" | "no";
      upsert?: boolean;
      seriazlie?: boolean;
      force?: boolean;
    }
  ) {
    const {
      autoload = "no",
      upsert = true,
      seriazlie = false,
      force = false,
    } = options ?? {};

    if (this.config.config.options.protected.includes(key)) {
      throw new Error(`Protected Option - ${key}`);
    }

    if (!force && val.options.shape[key as types.DefaultOptionNames]) {
      value = val.options.shape[key as types.DefaultOptionNames].parse(value);
    }

    let id = [0];

    const data = this.validator.exec(
      val.database.wpOptions.omit({ option_id: true }),
      {
        option_name: key,
        option_value: seriazlie
          ? phpSerialize(value)
          : new String(value).toString(),
        autoload,
      }
    );

    const trx = await this.database.transaction;
    try {
      if (upsert) {
        await trx
          .insert(data)
          .into(this.tables.get("options"))
          .onConflict("option_name")
          .merge(["option_value", "autoload"])
          .then((r) => {
            id = r;
          });
      } else {
        await trx
          .insert(data)
          .into(this.tables.get("options"))
          .onConflict("option_name")
          .ignore()
          .then((r) => {
            id = r;
          });
      }
    } catch (e) {
      await trx.rollback();
      this.logger.warn(`Error: ${e}`);
    }
    await trx.commit();

    return id[0];
  }

  // delete_option
  async remove(key: string) {
    if (!key || 0 >= key.length) {
      return;
    }

    if (
      this.config.config.options.protected.includes(key) ||
      this.config.config.options.defaults.includes(key)
    ) {
      return;
    }

    const trx = await this.database.transaction;
    try {
      await trx
        .table(this.tables.get("options"))
        .where("option_name", key)
        .del();
    } catch (e) {
      await trx.rollback();
      throw new Error("Failed to delete option");
    }
    await trx.commit();
  }
}
