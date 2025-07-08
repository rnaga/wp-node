import { component } from "../../decorators/component";
import { Components } from "../components";
import { Post } from "../post";
import { PostUtil } from "./post.util";
import { Config } from "../../config";
import { QueryUtil } from "./query.util";
import type * as types from "../../types";
import { PostsQuery } from "../../query-builder";

type RevisionColumns = Extract<
  types.Columns<"posts"> & keyof types.trx.PostUpsert,
  "post_title" | "post_content" | "post_excerpt"
>;

@component()
export class RevisionUtil {
  // _wp_post_revision_fields
  static revisionFields: Record<RevisionColumns, string> = {
    post_title: "Title",
    post_content: "Content",
    post_excerpt: "Excerpt",
  } as const;
  constructor(
    private components: Components,
    private config: Config,
    private postUtil: PostUtil
  ) {}

  // wp_get_post_autosave
  async getAutosave(postId: number, userId: number = 0) {
    const queryUtil = this.components.get(QueryUtil);

    const posts = await queryUtil.posts((query) => {
      if (userId > 0) {
        query.where("post_author", userId);
      }
      query
        .where("post_parent", postId)
        .where("post_type", "revision")
        .where("post_status", "inherit")
        .where("post_name", `${postId}-autosave-v1`)
        .builder.limit(1);
    });

    if (!posts) {
      return undefined;
    }

    const postUtil = this.components.get(PostUtil);
    return await postUtil.get(posts[0].ID);
  }

  // wp_get_post_revisions
  async getList(postOrId: Post | number, fn?: (query: PostsQuery) => void) {
    const post =
      typeof postOrId == "number"
        ? await this.postUtil.get(postOrId)
        : postOrId;

    if (!post.props || !post.props.ID) {
      return [];
    }

    const postId = post.props.ID;

    if (0 >= this.config.config.constants.WP_POST_REVISIONS) {
      return [];
    }

    const queryUtil = this.components.get(QueryUtil);
    const revisions =
      (await queryUtil.posts((query) => {
        const { column } = query.alias;
        query.from
          .withChildren(postId)
          .where("post_type", "revision")
          .where("post_status", "inherit")
          .builder.orderBy(column("posts", "ID"), "desc");
        if (fn) {
          fn(query);
        }
      })) ?? [];

    return revisions;
  }

  // _wp_post_revision_data
  convertToData(post: types.Tables["posts"], autosave = false) {
    const revisionData: Record<string, any> = {};

    const commonFields = Object.keys(
      RevisionUtil.revisionFields
    ) as RevisionColumns[];

    for (const field of commonFields) {
      revisionData[field] = post[field] ?? "";
    }

    revisionData["post_parent"] = post.ID;
    revisionData["post_status"] = "inherit";
    revisionData["post_type"] = "revision";
    revisionData["post_name"] = autosave
      ? `${post.ID}-autosave-v1`
      : `${post.ID}-revision-v1`;
    revisionData["post_date"] = post.post_modified || "";
    revisionData["post_date_gmt"] = post.post_modified_gmt || "";

    return revisionData;
  }
}
