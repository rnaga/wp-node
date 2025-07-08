import { z } from "zod";

import { Config } from "../config";
import { Components } from "../core/components";
import { MetaUtil } from "../core/utils/meta.util";
import { QueryUtil } from "../core/utils/query.util";
import { component } from "../decorators/component";
import { MetaTrx } from "../transactions/meta.trx";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

type DataType = z.infer<typeof val.sitemeta>;

// src/wp-admin/network/settings.php
@component()
export class SitemetaCrud extends Crud {
  constructor(components: Components, private config: Config) {
    super(components);
  }

  private async checkPermission(siteId: number) {
    const { user } = await this.getUser();
    if (
      !this.config.isMultiSite() ||
      !(await user.can("manage_network_options", [siteId]))
    ) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const queryUtil = this.components.get(QueryUtil);
    const site = await queryUtil.sites((query) => {
      query.where("id", siteId).builder.first();
    }, val.database.wpSite);

    if (!site) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Site not found");
    }
  }

  async get(siteId: number) {
    await this.checkPermission(siteId);

    const metaUtil = this.components.get(MetaUtil);
    const meta = metaUtil.get("site", siteId);
    const data = await meta.props();

    return this.returnValue(data as Partial<DataType>);
  }

  async update(siteId: number, input: Partial<DataType>) {
    await this.checkPermission(siteId);

    const data = val.sitemeta.partial().parse(input);
    const metaTrx = this.components.get(MetaTrx);

    for (const [key, val] of Object.entries(data)) {
      await metaTrx.upsert("site", siteId, key, val);
    }

    return this.returnValue(true);
  }
}
