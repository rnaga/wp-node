import { z } from "zod";

import { formatting } from "../common";
import { Config } from "../config";
import { Scope } from "../constants";
import { component } from "../decorators/component";
import * as val from "../validators";
import { Components } from "./components";
import { Current } from "./current";
import { Logger } from "./logger";
import { MetaUtil } from "./utils/meta.util";
import { QueryUtil } from "./utils/query.util";

@component({ scope: Scope.Transient })
export class Options {
  constructor(
    private components: Components,
    private logger: Logger,
    private config: Config
  ) {}

  private get tables() {
    return this.components.get(Current).tables;
  }

  usingBlog(id: number) {
    if (this.config.isMultiSite()) this.tables.index = id;
    return this;
  }

  resetBlog() {
    this.usingBlog(-99);
    return this;
  }

  private async getMultiple(
    names: string[],
    args?: {
      siteId?: number | undefined;
      blogId?: number | undefined;
    }
  ) {
    const queryUtil = this.components
      .get(QueryUtil)
      .usingBlog(this.tables.index);

    const result = new Map<string, any>();

    try {
      if (typeof args?.siteId === "number") {
        const metaUtil = this.components.get(MetaUtil);
        for (const name of names) {
          const value = await metaUtil.getValue("site", args.siteId, name);
          result.set(name, formatting.primitive(value));
        }
      } else {
        const options =
          (await queryUtil
            .usingBlog(args?.blogId ?? this.tables.index)
            .options((query) => {
              query.whereIn(names);
            }, z.array(val.database.wpOptions))) ?? [];

        for (const option of options) {
          result.set(
            option.option_name,
            formatting.primitive(option.option_value)
          );
        }
      }
    } catch (e) {
      this.logger.info(`Option not found: ${names}`);
    }

    return result;
  }

  async get<T = string, Name extends string | string[] = string>(
    name: Name,
    args?: {
      withPrefix?: boolean;
      siteId?: number | undefined;
      blogId?: number | undefined; // get_blog_option
      default?: T;
    }
  ): Promise<Name extends string ? T | undefined : Map<string, any>> {
    const queryUtil = this.components
      .get(QueryUtil)
      .usingBlog(this.tables.index);
    let value: any;

    try {
      if (Array.isArray(name)) {
        return (await this.getMultiple(name, args)) as any;
      } else if (typeof name === "string") {
        if (typeof args?.siteId === "number") {
          // get_network_option( null, $option, $default_value )
          // get_site_option( $option, $default_value = false, $deprecated = true )
          const metaUtil = this.components.get(MetaUtil);
          value = await metaUtil.getValue("site", args.siteId, name);
        } else {
          const option = await queryUtil
            .usingBlog(args?.blogId ?? this.tables.index)
            .options((query) => {
              query.get(args?.withPrefix ? this.tables.get(name) : name);
            });
          value = formatting.primitive(option?.option_value);
        }
      }
    } catch (e) {
      this.logger.info(`Option not found: ${name}`);
    }

    if (!value && args?.default) {
      value = args.default;
    }

    return (value as T) ?? (undefined as any);
  }
}
