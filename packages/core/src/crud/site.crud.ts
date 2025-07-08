import { z } from "zod";

import { Config } from "../config";
import { Components } from "../core/components";
import { Installer } from "../core/installer";
import { MetaUtil } from "../core/utils/meta.util";
import { QueryUtil } from "../core/utils/query.util";
import { component } from "../decorators/component";
import { SiteQuery } from "../query-builder";
import { BlogTrx, SiteTrx } from "../transactions";
import * as val from "../validators";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

import type * as types from "../types";
import { Current } from "../core/current";
import { SiteUtil } from "../core/utils/site.util";

//type DataType = types.Tables["site"] & { site_meta: Record<string, any> };
type DataListType = (types.WpSite & { site_name: string })[];
type SiteUpsert = z.infer<typeof val.trx.siteUpsert>;

@component()
export class SiteCrud extends Crud {
  constructor(
    components: Components,
    private config: Config,
    private siteUtil: SiteUtil
  ) {
    super(components);
  }

  private async checkPermission(siteId?: number) {
    const { user } = await this.getUser();

    const current = this.components.get(Current);
    const siteIds = [siteId ?? current.siteId];

    if (
      !this.config.isMultiSite() ||
      0 >= siteIds.length ||
      !(await user.can("manage_network", siteIds))
    ) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }
  }

  async get(siteId: number) {
    await this.checkPermission(siteId);

    const queryUtil = this.components.get(QueryUtil);
    const site = await queryUtil.sites((query) => {
      query.where("id", siteId).builder.first();
    }, val.database.wpSite);

    if (!site) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Site not found");
    }

    const metaUtil = this.components.get(MetaUtil);
    const meta = metaUtil.get("site", siteId);

    return this.returnValue({
      ...site,
      site_meta: await meta.props(),
    });
  }

  async create(
    args: {
      domain: string;
      siteName: string;
      path: string;
    },
    options?: {
      subdomainInstall?: boolean;
    }
  ) {
    await this.checkPermission();

    const paths = args.path.split("/");
    const domains =
      args.domain.split(".").length > 2
        ? [args.domain.substring(0, args.domain.indexOf("."))]
        : [];

    const queryUtil = this.components.get(QueryUtil);
    const reservedNames = await this.siteUtil.getReservedNames();

    for (const slug of [...domains, ...paths].filter(Boolean)) {
      const parsed = z
        .string()
        .min(4)
        .regex(/^[a-z0-9]+$/)
        .refine((value) => !/^[0-9]*$/.test(value))
        .safeParse(slug);

      if (!parsed.success) {
        throw new CrudError(StatusMessage.BAD_REQUEST, `Invalid input ${slug}`);
      }

      const user = await queryUtil.users((query) => {
        query.where("user_login", slug).builder.first();
      }, val.database.wpUsers);

      if (user?.ID) {
        throw new CrudError(
          StatusMessage.BAD_REQUEST,
          "Invalid input (user_login)"
        );
      }

      if (!this.config.isSubdomainInstall() && reservedNames.includes(slug)) {
        throw new CrudError(
          StatusMessage.BAD_REQUEST,
          "Invalid input (reserved name)"
        );
      }
    }

    const { user } = await this.getUser();

    if (!user.props?.user_email) {
      throw new CrudError(
        StatusMessage.INTERNAL_SERVER_ERROR,
        "User's email is empty"
      );
    }

    const email = user.props.user_email;

    const installer = this.components.get(Installer);
    const siteId = await installer.initializeSite({ ...args, email }, options);

    // Create primary blog
    const blogTrx = this.components.get(BlogTrx);
    const blogId = await blogTrx.upsert({
      site_id: siteId,
      domain: args.domain,
      path: args.path,
      user_id: user.props.ID,
    });

    return this.returnValue({
      siteId,
      blogId,
    });
  }

  async update(siteId: number, data: Partial<SiteUpsert>) {
    await this.checkPermission(siteId);

    const site = await this.get(siteId);

    if (!site.data.id || 0 >= site.data.id) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Site not found");
    }

    data.id = siteId;
    const siteTrx = this.components.get(SiteTrx);
    return this.returnValue(
      await siteTrx.insert(data, {
        upsert: true,
      })
    );
  }

  async delete(siteId: number, options?: { newSiteId?: number }) {
    await this.checkPermission(siteId);

    const { newSiteId } = options ?? {};

    const site = await this.get(siteId);

    if (!site.data.id || 0 >= site.data.id) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Site not found");
    }

    const installer = this.components.get(Installer);
    return this.returnValue(
      await installer.uninitializeSite(siteId, newSiteId)
    );
  }

  async list(args: Partial<z.infer<typeof val.crud.siteListParams>>) {
    await this.checkPermission();

    const queryUtil = this.components.get(QueryUtil);
    const parsedArgs = val.crud.siteListParams.parse(args ?? {});

    const buildQuery = (query: SiteQuery) => {
      const { column } = query.alias;
      const offset =
        parsedArgs.offset ?? (parsedArgs.page - 1) * parsedArgs.per_page;
      const limit = parsedArgs.per_page;

      query.builder.offset(offset).limit(limit).groupBy(column("site", "id"));

      if (parsedArgs.orderby) {
        query.builder.orderBy(
          column("site", parsedArgs.orderby),
          parsedArgs.order
        );
      }

      if (parsedArgs.search) {
        query.andWhere((query) => {
          const searchColumns = ["domain", "path"] as const;
          for (const searchColumn of searchColumns) {
            parsedArgs.search &&
              query.or.whereLike(searchColumn, parsedArgs.search);
          }
        });
      }

      for (const key of Object.keys(parsedArgs) as Array<
        keyof typeof parsedArgs
      >) {
        const value = parsedArgs[key];
        if (!value) continue;

        switch (key) {
          case "include":
            query.whereIn("id", value as number[]);
            break;
          case "exclude":
            query.andWhereNot((query) =>
              query.whereIn("id", value as number[])
            );
            break;
          case "domain":
            query.whereIn("domain", value as string[]);
            break;
          case "domain_exclude":
            query.andWhereNot((query) =>
              query.whereIn("domain", value as string[])
            );
            break;
          case "path":
            query.where("path", value);
            break;
        }
      }
    };

    const sites =
      (await queryUtil.sites((query) => {
        buildQuery(query);
      })) ?? [];

    const counts = await queryUtil.sites((query) => {
      buildQuery(query);
      query.count("site", "id");
    }, val.query.resultCount);

    const data: DataListType = [];

    const metaUtil = this.components.get(MetaUtil);
    for (const site of sites) {
      const meta = metaUtil.get("site", site.id);
      const metas = await meta.props();

      data.push({
        ...site,
        site_name: metas?.site_name,
        //site_meta: await meta.props(),
      });
    }

    const pagination = this.pagination({
      page: parsedArgs.page,
      limit: parsedArgs.per_page,
      count: counts?.count ?? 0,
    });

    return this.returnValue(data, {
      pagination,
    });
  }
}
