import { Config } from "../../config";
import { component } from "../../decorators/component";
import * as types from "../../types";
import { Blog } from "../blog";
import { Components } from "../components";
import { Current } from "../current";
import { Options } from "../options";
import { Site } from "../site";
import { BlogUtil } from "./blog.util";
import { QueryUtil } from "./query.util";

@component()
export class SiteUtil {
  constructor(private components: Components, private config: Config) {}

  async get(siteRef: string | number) {
    return await this.components.asyncGet(Site, [siteRef]);
  }

  async toSites(sites: types.Tables["site"][], blogId: number) {
    const arr = [];

    for (const site of sites) {
      arr.push(await this.components.asyncGet(Site, [site.id, blogId]));
    }
    return arr;
  }

  // get_main_network_id
  async getMainSiteId() {
    if (!this.config.isMultiSite()) {
      return 1;
    }

    const current = this.components.get(Current);
    const siteId = current.siteId;
    if (siteId === 1) {
      return 1;
    }

    const queryUtil = this.components.get(QueryUtil);
    const sites = await queryUtil.sites((query) => {
      query.builder.limit(1);
    });

    return sites?.[0]?.id ?? 1;
  }

  // async getList() {
  //   const queryUtil = this.components.get(QueryUtil);
  //   const metaUtil = this.components.get(MetaUtil);
  //   const sites = (await queryUtil.sites((query) => query)) ?? [];

  //   const result: (types.Tables["site"] & {
  //     sitename: string;
  //     blogs: Awaited<ReturnType<InstanceType<typeof SiteUtil>["getBlogs"]>>;
  //   })[] = [];
  //   for (const site of sites) {
  //     result.push({
  //       ...site,
  //       sitename:
  //         (await metaUtil.getValue("site", site.id, "site_name")) ??
  //         site.domain,
  //       blogs: (await this.getBlogs(site.id)) ?? [],
  //     });
  //   }

  //   return result;
  // }

  async getBlogs(siteId: number) {
    const queryUtil = this.components.get(QueryUtil);
    const blogUtil = this.components.get(BlogUtil);
    const blogArr =
      (await queryUtil.blogs((query) => {
        query.where("site_id", siteId);
      })) ?? [];

    const result: Blog[] = [];
    for (const item of blogArr) {
      const blog = await blogUtil.get(item.blog_id);
      blog.props && result.push(blog);
    }

    return result;
  }

  async getReservedNames(siteId?: number) {
    const options = this.components.get(Options);
    const current = this.components.get(Current);

    const illigalNames = await options.get<string[]>("illegal_names", {
      siteId: siteId ?? current.siteId,
    });

    const defaultReservedNames =
      this.config.config.multisite.subdirectoryReservedNames;

    return Array.from(
      new Set([
        ...(Array.isArray(illigalNames) ? illigalNames : []),
        ...defaultReservedNames,
      ])
    );
  }

  private async getSiteOptions<T = string>(
    name: string,
    defaultValue: T,
    siteId?: number
  ) {
    const optionsCore = this.components.get(Options);
    const current = this.components.get(Current);

    return (
      (await optionsCore.get<T>(name, {
        siteId: siteId ?? current.siteId,
      })) ?? defaultValue
    );
  }

  // is_email_address_unsafe
  async isEmailUnsafe(email: string, options?: { siteId?: number }) {
    const { siteId } = options ?? {};

    let isEmailAddressUnsafe = false;
    const bannedNames = await this.getSiteOptions<string[]>(
      "banned_email_domains",
      [],
      siteId
    );

    if (email.includes("@")) {
      const normalizedEmail = email.toLowerCase();
      const emailDomain = normalizedEmail.split("@")[1];
      const bannedDomainsLower = !Array.isArray(bannedNames)
        ? []
        : bannedNames.map((name) => name.toLowerCase());

      isEmailAddressUnsafe = bannedDomainsLower.some(
        (bannedDomain) =>
          emailDomain === bannedDomain ||
          normalizedEmail.endsWith(`.${bannedDomain}`)
      );
    }

    return isEmailAddressUnsafe;
  }

  async isLimitedEmailDomains(email: string, options?: { siteId: number }) {
    const { siteId } = options ?? {};

    let limitedEmailDomains = await this.getSiteOptions<string[]>(
      "limited_email_domains",
      [],
      siteId
    );

    if (Array.isArray(limitedEmailDomains) && limitedEmailDomains.length > 0) {
      limitedEmailDomains = limitedEmailDomains.map((domain) =>
        domain.toLowerCase()
      );
      const emailDomain = email.substring(email.indexOf("@") + 1).toLowerCase();

      if (!limitedEmailDomains.includes(emailDomain)) {
        return false;
      }
    }

    return true;
  }
}
