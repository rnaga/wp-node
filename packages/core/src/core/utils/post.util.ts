import { Config } from "../../config";
import { component } from "../../decorators/component";
import * as defaults from "../../defaults";
import { Components } from "../components";
import { Current } from "../current";
import { Post } from "../post";
import { QueryUtil } from "./query.util";

import type * as types from "../../types";

@component()
export class PostUtil {
  constructor(private config: Config, private components: Components) {}

  toPost(post: types.Tables["posts"]) {
    return this.components.get(Post, [post.ID, post]);
  }

  toPosts(posts: types.Tables["posts"][]) {
    return posts.map((post) => this.toPost(post));
  }

  async get(id: number) {
    return await this.components.asyncGet(Post, [id]);
  }

  async getBySlug(slug: string) {
    const queryUtil = this.components.get(QueryUtil);
    const posts = await queryUtil.posts((query) =>
      query.where("post_name", slug).builder.limit(1)
    );

    const postId = posts?.[0]?.ID;
    return postId ? await this.get(postId) : undefined;
  }

  // is_post_publicly_viewable
  async isPubliclyViewable(postIdOrPost: number | Post) {
    const post =
      typeof postIdOrPost == "number"
        ? await this.get(postIdOrPost)
        : postIdOrPost;

    if (!post.props?.ID || 0 >= post.props.ID) {
      return false;
    }

    return (
      this.isTypeViewable(post.props.post_type) &&
      this.isStatusViewable(post.props.post_status)
    );
  }

  getViewableTypes() {
    return Object.keys(this.config.config.posts.types).filter((type) =>
      this.isTypeViewable(type)
    ) as types.PostType[];
  }

  // is_post_type_viewable
  isTypeViewable(
    typeObjectOrString: string | ReturnType<PostUtil["getTypeObject"]>
  ) {
    const typeObject =
      typeof typeObjectOrString === "string"
        ? this.getTypeObject(typeObjectOrString)
        : typeObjectOrString;

    if (!typeObject) {
      return false;
    }

    return (
      typeObject.publiclyQueryable || (typeObject._builtin && typeObject.public)
    );
  }

  // https://github.com/WordPress/WordPress/blob/master/wp-includes/post.php
  // is_post_status_viewable
  isStatusViewable(
    statusObjectOrString: string | ReturnType<PostUtil["getStatusObject"]>
  ): boolean {
    const statusObject =
      typeof statusObjectOrString === "string"
        ? this.getStatusObject(statusObjectOrString)
        : statusObjectOrString;

    if (
      !statusObject ||
      true == statusObject.internal ||
      true == statusObject.protected
    ) {
      return false;
    }

    return true == statusObject._builtin && true == statusObject.public;
  }

  // https://github.com/WordPress/WordPress/blob/master/wp-includes/post.php
  // get_post_status_object
  getStatusObject(status: typeof defaults.postStatuses | string | undefined) {
    return !status || !this.config.config.posts.statuses[status as string]
      ? undefined
      : this.config.config.posts.statuses[status as string];
  }

  // https://github.com/WordPress/WordPress/blob/master/wp-includes/post.php
  // get_post_status
  async getStatus(post?: Post, parent?: Post): Promise<string | undefined> {
    if (!post?.props) {
      const current = this.components.get(Current);
      if (!current.post) {
        return undefined;
      }
      post = current.post;
    }

    const postParent =
      parent ??
      (await this.components.asyncGet(Post, [post.props?.post_parent]));

    let postStatus: string | undefined = post.props?.post_status;

    if ("attachment" === post.props?.post_type && "inherit" === postStatus) {
      if (
        0 === post.props.post_parent ||
        !postParent.props ||
        post.props.ID === post.props.post_parent
      ) {
        // Unattached attachments with inherit status are assumed to be published.
        postStatus = "publish";
      } else if ("trash" === (await this.getStatus(postParent))) {
        // Get parent status prior to trashing.
        postStatus = await postParent.meta.get("_wp_trash_meta_status");

        if (!postStatus) {
          // Assume publish as above.
          postStatus = "publish";
        }
      } else {
        postStatus = await this.getStatus(postParent);
      }
    } else if (
      "attachment" === post.props?.post_type &&
      !["private", "trash", "auto-draft"].includes(
        post.props?.post_status ?? ""
      )
    ) {
      /*
       * Ensure uninherited attachments have a permitted status either 'private', 'trash', 'auto-draft'.
       * This is to match the logic in wp_insert_post().
       *
       * Note: 'inherit' is excluded from this check as it is resolved to the parent post's
       * status in the logic block above.
       */
      postStatus = "publish";
    }

    return postStatus;
  }

  // get_attached_file
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAttachedFile(postId: number, unfiltered = false) {
    const post = await this.get(postId);
    if (!post.props) {
      return undefined;
    }

    let file = await post.meta.get<string>("_wp_attached_file");

    if (!file) {
      return undefined;
    }

    // If the file is relative, prepend upload dir.
    if (file && !file.startsWith("/") && !/^.:\\/.test(file)) {
      file = `${this.config.config.staticAssetsPath}/${file}`;
    }

    return file;
  }

  // wp_get_attachment_metadata
  async getAttachmentMetadata<T = Record<string, any>>(postId: number) {
    const post = await this.get(postId);
    if (!post.props) {
      return undefined;
    }

    const meta = await post.meta.get<T>("_wp_attachment_metadata");

    if (!meta) {
      return undefined;
    }

    return meta;
  }

  // https://github.com/WordPress/WordPress/blob/master/wp-includes/post.php
  // get_post_type_object
  getTypeObject<T>(
    name: T | (typeof defaults.postTypes)[number]
  ): types.Config["posts"]["types"][string] | undefined;
  getTypeObject(name: any) {
    const type = this.config.config.posts.types[name];
    if (!type) {
      return undefined;
    }
    type.capabilities = {
      ...(type.capabilities ?? {}),
      ...this.getCapabilities(type),
    };
    return type;
  }

  // get_post_type_capabilities
  private getCapabilities(args: types.Config["posts"]["types"][string]) {
    const capabilityType = !Array.isArray(args?.capabilityType)
      ? [args.capabilityType, args.capabilityType + "s"]
      : args.capabilityType;

    // Singular base for meta capabilities, plural base for primitive capabilities.
    const [singular_base, plural_base] = capabilityType;

    let defaultCapabilities = {
      // Meta capabilities.
      edit_post: "edit_" + singular_base,
      read_post: "read_" + singular_base,
      delete_post: "delete_" + singular_base,
      // Primitive capabilities used outside of map_meta_cap():
      edit_posts: "edit_" + plural_base,
      edit_others_posts: "edit_others_" + plural_base,
      delete_posts: "delete_" + plural_base,
      publish_posts: "publish_" + plural_base,
      read_private_posts: "read_private_" + plural_base,
    };

    // Primitive capabilities used within map_meta_cap():
    if (args.mapMetaCap) {
      defaultCapabilities = {
        ...defaultCapabilities,
        ...{
          read: "read",
          delete_private_posts: "delete_private_" + plural_base,
          delete_published_posts: "delete_published_" + plural_base,
          delete_others_posts: "delete_others_" + plural_base,
          edit_private_posts: "edit_private_" + plural_base,
          edit_published_posts: "edit_published_" + plural_base,
        },
      };
    }

    const capabilities: Record<string, string> = {
      ...defaultCapabilities,
      ...(args.capabilities ?? {}),
    };

    // Post creation capability simply maps to edit_posts by default:
    if (!capabilities || !capabilities["create_posts"]) {
      capabilities["create_posts"] = capabilities["edit_posts"];
    }

    return capabilities;
  }

  // wp_unique_post_slug
  async getUniqueSlug(
    slug: string,
    post: number | Post,
    maxSuffix: number = 10
  ): Promise<string> {
    const queryUtil = this.components.get(QueryUtil);

    if (typeof post === "number") {
      post = await this.get(post);
    }

    slug = slug?.trim();
    const postId = post.props?.ID ?? 0;
    const postParent = post.props?.post_parent ?? 0;
    const postType = post.props?.post_type ?? "";
    const postStatus = post.props?.post_status ?? "";

    const postTypeObject = this.getTypeObject(postType);

    if (
      ["draft", "pending", "auto-draft"].includes(postStatus) ||
      ("inherit" === postStatus && "revision" === postType) ||
      "user_request" === postType ||
      ("nav_menu_item" == postType && postTypeObject?.hierarchical)
    ) {
      return slug ?? post.props?.post_name;
    }

    slug = this.truncateSlug(slug);

    if (!slug || 0 >= slug.length) {
      return slug;
    }

    for (let suffix = 0; suffix < maxSuffix; suffix++) {
      const newSlug = 0 >= suffix ? slug : `${slug}-${suffix + 1}`;
      const posts = await queryUtil.posts((query) => {
        query
          .where("post_name", newSlug)
          .builder.not.__ref(query)
          .where("ID", postId);
        if (postTypeObject?.hierarchical) {
          query
            .whereIn("post_type", ["attachment", postType])
            .where("post_parent", postParent);
        }
      });

      if (!posts) {
        return newSlug;
      }
    }

    return `${slug}-${Math.floor(
      Math.random() * (maxSuffix + 999990010 - maxSuffix + 1) + maxSuffix + 1
    )}`;
  }

  //  _truncate_post_slug
  private truncateSlug(slug: string, length: number = 200): string {
    if (slug.length > length) {
      const decodedSlug = decodeURIComponent(slug);
      if (decodedSlug === slug) {
        slug = slug.substring(0, length);
      } else {
        slug = encodeURIComponent(decodedSlug).slice(0, length);
      }
    }

    return slug.replace(/-+$/, ""); // Remove trailing hyphens
  }
}
