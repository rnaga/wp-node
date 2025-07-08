import { Config } from "../../config";
import { component } from "../../decorators/component";
import { Components } from "../components";
import { Current } from "../current";
import { Options } from "../options";
import { Post } from "../post";
import { Vars } from "../vars";
import { PostUtil } from "./post.util";

@component()
export class LinkUtil {
  constructor(
    private components: Components,
    private postUtil: PostUtil,
    private vars: Vars,
    private config: Config
  ) {}

  // get_permalink
  async getPermalink(post: Post) {
    if (!post.props?.ID) {
      return this.getHomeUrl();
    }

    if ("page" === post.props.post_type) {
      return await this.getPageLink(post);
    }

    if ("attachment" === post.props.post_type) {
      return await this.getAttachmentLink(post);
    }

    return this.getHomeUrl({
      path: `?p=${post.props.ID}`,
    });
  }

  // get_attachment_link
  async getAttachmentLink(post?: Post) {
    return !post
      ? await this.getHomeUrl()
      : await this.getHomeUrl({ path: `/?attachment_id=${post.props?.ID}` });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPageLink(post?: Post, leavename = false, sample = false) {
    if (!post || !post.props?.ID) {
      return await this.getHomeUrl();
    }

    const options = this.components.get(Options);

    if (
      "page" === (await options.get("show_on_from")) &&
      (await options.get<number>("page_on_from")) === post.props.ID
    ) {
      return await this.getHomeUrl();
    }

    return await this.getHomeUrl({ path: `?page_id=${post.props.ID}` });
  }

  private forcePlainPostPermalink(post: Post) {
    const postUtil = this.components.get(PostUtil);
    const current = this.components.get(Current);
    const sample = post.filter == "sample";

    if (!post.props?.ID && post.props && 0 >= post.props.ID) {
      return true;
    }

    const statusObject = postUtil.getStatusObject(post.props?.post_status);
    const typeObject = postUtil.getTypeObject(post.props?.post_type);

    if (!statusObject || !typeObject) {
      return true;
    }

    if (
      // Publicly viewable links never have plain permalinks.
      postUtil.isStatusViewable(statusObject) ||
      // Private posts don't have plain permalinks if the user can read them.
      (true == statusObject.private &&
        post.props?.ID &&
        current.user?.can("read_post", post.props.ID)) ||
      // Protected posts don't have plain links if getting a sample URL.
      (true == statusObject.protected && sample)
    ) {
      return false;
    }

    return true;
  }

  async getHomeUrl(args?: {
    blogId?: number;
    path?: string;
    scheme?: "http" | "https" | "relative" | "rest";
  }) {
    let { scheme = undefined } = args ?? {};
    const { blogId = undefined, path = "" } = args ?? {};
    const options = this.components.get(Options);

    if (blogId && this.config.isMultiSite()) {
      options.usingBlog(blogId);
    }
    let url = (await options.get<string>("home")) ?? "";
    options.resetBlog();

    if (!["http", "https", "relative"].includes(scheme ?? "")) {
      scheme = this.config.isSsl() ? "https" : "http";
    } else {
      try {
        const protocol = new URL(url).protocol.replace(/:$/, "");
        scheme = ["http", "https", "relative", "rest"].includes(protocol)
          ? (protocol as typeof scheme)
          : (scheme = this.config.isSsl() ? "https" : "http");
      } catch (e) {
        scheme = this.config.isSsl() ? "https" : "http";
      }
    }

    url = this.setUrlScheme(url, scheme);

    if (typeof path === "string") {
      url = `${url}/${path.replace(/^\//, "")}`;
    }
    return url;
  }

  setUrlScheme(url: string, scheme: string | null = null): string {
    if (
      !scheme ||
      ["admin", "login", "login_post", "rpc"].includes(scheme) ||
      !["http", "https", "relative"].includes(scheme)
    ) {
      scheme = this.config.isSsl() ? "https" : "http";
    }

    url = url.trim();

    if (url.startsWith("//")) {
      url = "https:" + url;
    }

    if (scheme === "relative") {
      url = url.replace(/^\w+:\/\//, ""); // Remove the scheme
      if (url !== "" && url[0] === "/") {
        // eslint-disable-next-line no-control-regex
        url = "/" + url.replace(/^[/ \t\n\r\0\x0B]+/, "");
      }
    } else {
      url = url.replace(/^\w+:\/\//, scheme + "://");
    }

    return url;
  }
}
