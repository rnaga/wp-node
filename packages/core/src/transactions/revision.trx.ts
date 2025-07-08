import { formatting } from "../common";
import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Post } from "../core/post";
import { MetaUtil } from "../core/utils/meta.util";
import { PostUtil } from "../core/utils/post.util";
import { RevisionUtil } from "../core/utils/revision.util";
import { Vars } from "../core/vars";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as types from "../types";
import { MetaTrx } from "./meta.trx";
import { PostTrx } from "./post.trx";
import { Trx } from "./trx";
import * as val from "../validators";
import { diffObject } from "../common/diff";

@transactions()
export class RevisionTrx extends Trx {
  constructor(
    private database: Database,
    private config: Config,
    private components: Components,
    private postUtil: PostUtil,
    private revisionUtil: RevisionUtil,
    private vars: Vars
  ) {
    super(components);
  }

  //  _wp_put_post_revision
  async upsert(
    post: types.Tables["posts"],
    options?: {
      autoSave?: boolean;
      meta?: Record<string, any>;
    }
  ) {
    const { autoSave = false, meta = undefined } = options ?? {};

    // start _wp_put_post_revision
    const postInput = formatting.slash(
      this.revisionUtil.convertToData(post, autoSave)
    );

    const postTrx = this.components.get(PostTrx);
    const revisionId = await postTrx.upsert(postInput);

    await this.syncMeta(post.ID, revisionId, { meta });

    return revisionId;
  }

  // wp_save_revisioned_meta_fields
  // wp_restore_post_revision_meta
  private async syncMeta(
    srcPostId: number,
    dstPostId: number,
    options?: {
      excludekeys?: string[];
      meta?: Record<string, any>;
    }
  ) {
    const { excludekeys = [] } = options ?? {};
    const metaTrx = this.components.get(MetaTrx);
    const metaUtil = this.components.get(MetaUtil);
    const postUtil = this.components.get(PostUtil);

    const srcPost = await postUtil.get(srcPostId);
    const srcMetas = { ...(await srcPost.meta.props()), ...options?.meta };

    if (Object.keys(srcMetas).length === 0) {
      return;
    }

    const syncedMetaKeys: string[] = [];
    for (const [key, value] of Object.entries(srcMetas)) {
      // Skip protected meta keys or excluded keys passed in options
      if (metaUtil.isProtected(key, "post") || excludekeys.includes(key)) {
        syncedMetaKeys.push(key);
        continue;
      }

      await metaTrx.upsert("post", dstPostId, key, value, {
        serialize: typeof value === "object",
      });

      syncedMetaKeys.push(key);
    }

    // Remove meta keys that are not in the source post
    const dstPost = await postUtil.get(dstPostId);
    const dstMetas = await dstPost.meta.props();

    for (const key in dstMetas) {
      if (syncedMetaKeys.includes(key) || metaUtil.isProtected(key, "post")) {
        continue;
      }

      await metaTrx.remove("post", {
        objectId: dstPostId,
        key,
      });
    }
  }

  // wp_save_post_revision
  async save(postId: number) {
    if (this.vars.DOING_AUTOSAVE) {
      return;
    }

    const post = await this.postUtil.get(postId);
    if (!post.props) {
      return;
    }

    const postType = this.postUtil.getTypeObject(post.props.post_type);
    if (!postType?.supports.includes("revisions")) {
      return;
    }

    if ("auto-draft" === post.props.post_type) {
      return;
    }

    /*
     * Compare the proposed update with the last stored revision verifying that
     * they are different, unless a plugin tells us to always save regardless.
     * If no previous revisions, save one.
     */
    let revisions = await this.revisionUtil.getList(postId);
    if (revisions.length > 0) {
      // Grab the latest revision, but not an autosave.
      const latestRevision =
        revisions.filter((revision) =>
          revision.post_name.includes(`${revision.post_parent}-revision`)
        )[0] ?? {};

      const fields = Object.keys(
        RevisionUtil.revisionFields
      ) as unknown as (keyof typeof RevisionUtil.revisionFields)[];

      const hasChanged =
        fields.filter(
          (column) =>
            post.props &&
            "string" === typeof post.props[column] &&
            "string" === typeof latestRevision[column] &&
            formatting.normalizeWhitespace(post.props[column]) !==
              formatting.normalizeWhitespace(latestRevision[column])
        ).length > 0;

      if (!hasChanged) {
        return;
      }
    }

    // start _wp_put_post_revision
    const resultPostId = await this.upsert(post.props);

    /*
     * If a limit for the number of revisions to keep has been set,
     * delete the oldest ones.
     */
    const WP_POST_REVISIONS = this.config.config.constants.WP_POST_REVISIONS;
    if (WP_POST_REVISIONS < 0) {
      return resultPostId;
    }

    revisions = await this.revisionUtil.getList(postId, (query) => {
      const { column } = query.alias;
      query.builder.clear("order").orderBy(column("posts", "ID"), "asc");
    });

    const deleteCount = revisions.length - WP_POST_REVISIONS;
    if (deleteCount < 1) {
      return resultPostId;
    }

    const sliceRevisions = revisions.slice(0, deleteCount);

    for (const revision of sliceRevisions) {
      if (revision.post_name.includes("autosave")) {
        continue;
      }
      await this.remove(revision.ID);
    }

    return resultPostId;
  }

  // wp_restore_post_revision
  async restore(
    revisionOrId: Post | number,
    options?: {
      fields?: (keyof typeof RevisionUtil.revisionFields)[];
    }
  ) {
    const fields =
      options?.fields ??
      (Object.keys(
        RevisionUtil.revisionFields
      ) as (keyof typeof RevisionUtil.revisionFields)[]);

    if (!fields) {
      return false;
    }

    const post =
      typeof revisionOrId == "number"
        ? await this.postUtil.get(revisionOrId)
        : revisionOrId;

    if (!post.props || !post.props.post_parent) {
      return post;
    }

    const parentId = post.props.post_parent;

    const postUpsert = fields
      .map((field) => ({
        [field]: formatting.slash(post.props ? post.props[field] : undefined),
      }))
      .reduce((a, b) => ({ ...a, ...b }), {});

    postUpsert.ID = parentId;

    const postTrx = this.components.get(PostTrx);

    const postId = await postTrx.upsert(postUpsert);

    const current = this.components.get(Current);
    const metaTrx = this.components.get(MetaTrx);

    await metaTrx.upsert(
      "post",
      postId,
      "_edit_last",
      current.user?.props?.ID ?? 0
    );

    await this.syncMeta(post.props.ID, postId);

    return postId;
  }

  // wp_delete_post_revision
  async remove(postOrId: Post | number) {
    const post =
      typeof postOrId == "number"
        ? await this.postUtil.get(postOrId)
        : postOrId;

    if (!post.props) {
      return post;
    }

    const postTrx = this.components.get(PostTrx);
    return await postTrx.remove(post.props.ID);
  }

  // class-wp-rest-autosaves-controller.php create_post_autosave
  async autosave(
    input: Partial<types.trx.PostUpsert>,
    options?: {
      userId?: number;
    }
  ) {
    const current = this.components.get(Current);
    const { userId = current.user?.props?.ID } = options ?? {};

    if (!userId) {
      // No user ID is provided. Skip autosave.
      return undefined;
    }

    const data = val.database.wpPosts.parse(input);

    const autosaveMeta = val.trx.postUpsert.shape.meta_input.parse(
      input.meta_input
    );
    const autosavePost = this.revisionUtil.convertToData(data, true);

    const post = await this.postUtil.get(data.ID);
    const postId = post.props?.ID;
    if (!postId) {
      // Post not found. Skip autosave.
      return undefined;
    }

    const oldAutosave = await this.revisionUtil.getAutosave(postId, userId);
    const diffData = diffObject(autosavePost, post.props) as Record<
      string,
      any
    >;
    const diffDataKeys = Object.keys(RevisionUtil.revisionFields).filter(
      (field) => diffData?.[field]
    );

    const meta = await post.meta.props();
    const diffMetaKeys = Object.keys(diffObject(autosaveMeta, meta));

    if (
      diffDataKeys.length === 0 &&
      diffMetaKeys.length === 0 &&
      oldAutosave?.props
    ) {
      // No changes. Skip autosave.
      return oldAutosave.props.ID;
    }

    // start _wp_put_post_revision
    const postInput = formatting.slash(
      this.revisionUtil.convertToData(data, true)
    );

    postInput.post_author = userId;

    // Store one autosave per author. If there is already an autosave, overwrite it.
    if (oldAutosave?.props) {
      postInput.ID = oldAutosave.props.ID;
    }

    const postTrx = this.components.get(PostTrx);
    const revisionId = await postTrx.upsert(postInput);

    await this.syncMeta(postId, revisionId, { meta });

    return revisionId;
  }
}
