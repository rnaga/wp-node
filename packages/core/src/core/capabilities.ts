import { Config } from "../config";
import { DO_NOT_ALLOW } from "../constants";
/* eslint-disable no-case-declarations */
import { component } from "../decorators/component";
import { Components } from "./components";
import { Current } from "./current";
import { Options } from "./options";
import { User } from "./user";
import { CommentUtil } from "./utils/comment.util";
import { MetaUtil } from "./utils/meta.util";
import { PostUtil } from "./utils/post.util";
import { TaxonomyUtil } from "./utils/taxonomy.util";
import { TermUtil } from "./utils/term.util";
import { UserUtil } from "./utils/user.util";
import { Vars } from "./vars";

import type * as types from "../types";

@component()
export class Capabilities {
  constructor(private config: Config, private components: Components) {}

  private addCap(
    set: Set<string>,
    postType: { capabilities?: Record<string, string> },
    key: string
  ) {
    if (!postType.capabilities || !postType.capabilities[key]) {
      return;
    }
    set.add(postType.capabilities[key]);
  }

  // https://github.com/WordPress/WordPress/blob/master/wp-includes/capabilities.php
  // map_meta_cap
  async check<T>(
    action: T | types.RoleCapabilityActions,
    user: User | number,
    ...args: any
  ): Promise<string[]>;
  async check(action: any, user: User | number, ...args: any) {
    //let results: string[] = [];
    let results = new Set<string>();
    let post, postType;

    const options = this.components.get(Options);
    const current = this.components.get(Current);
    const postUtil = this.components.get(PostUtil);
    const userUtil = this.components.get(UserUtil);
    const commentUtil = this.components.get(CommentUtil);
    const metaUtil = this.components.get(MetaUtil);
    const taxonomyUtil = this.components.get(TaxonomyUtil);
    const termUtil = this.components.get(TermUtil);
    const vars = this.components.get(Vars);

    if (!(user instanceof User)) {
      user = await userUtil.get(user);
    }

    const role = await user.role();

    if (!user) {
      return [DO_NOT_ALLOW];
    }

    switch (action) {
      case "remove_user":
        // In multisite the user must be a super admin to remove themselves.
        if (args[0] && user.props?.ID == args[0] && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
        } else {
          results.add("remove_users");
        }
        break;

      case "promote_user":
      case "add_users":
        results.add("promote_users");
        break;

      case "edit_user":
      case "edit_users":
        // Allow user to edit themselves.
        if ("edit_user" === action && args[0] && user.props?.ID == args[0]) {
          break;
        }

        const targetUser = await userUtil.get(args[0]);
        const targetRole = await targetUser.role();

        // In multisite the user must have manage_network_users caps. If editing a super admin, the user must be a super admin.
        if (
          this.config.isMultiSite() &&
          ((!role.isSuperAdmin() &&
            "edit_user" === action &&
            targetRole.isSuperAdmin()) ||
            !role.has("manage_network_users"))
        ) {
          results.add(DO_NOT_ALLOW);
        } else {
          results.add("edit_users"); // edit_user maps to edit_users.
        }

        break;

      case "delete_post":
      case "delete_page":
        if (!args[0]) {
          // When checking for the %s capability, you must always check it against a specific post.
          results.add(DO_NOT_ALLOW);
          break;
        }

        post = await postUtil.get(args[0]);

        if (!post.props?.ID) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        if ("revision" === post.props.post_type) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        if (
          parseInt((await options.get("page_for_posts")) ?? "-1") ==
            post.props.ID ||
          parseInt((await options.get("page_on_front")) ?? "-1") ==
            post.props.ID
        ) {
          results.add("manage_options");
          break;
        }

        postType = postUtil.getTypeObject(post.props.post_type);

        // The post type %1$s is not registered, so it may not be reliable
        // to check the capability %2$s against a post of that type.
        if (!postType) {
          results.add("edit_others_posts");
          break;
        }

        if (!postType.mapMetaCap) {
          this.addCap(results, postType, action);
          break;
        }

        //If the post author is set and the user is the author...
        if (
          post.props.post_author &&
          user.props?.ID == post.props.post_author
        ) {
          // If the post is published or scheduled...
          //if ( in_array( $post->post_status, array( 'publish', 'future' ), true ) ) {
          if (["publish", "future"].includes(post.props.post_status)) {
            this.addCap(results, postType, "delete_published_posts");
          } else if ("trash" === post.props.post_status) {
            const postStatus = await post.meta.get("_wp_trash_meta_status");
            if (postStatus && ["publish", "future"].includes(postStatus)) {
              this.addCap(results, postType, "delete_published_posts");
            } else {
              this.addCap(results, postType, "delete_posts");
            }
          } else {
            // If the post is draft...
            this.addCap(results, postType, "delete_posts");
          }
        } else {
          // The user is trying to edit someone else's post.
          this.addCap(results, postType, "delete_others_posts");
          // The post is published or scheduled, extra cap required.
          if (["publish", "future"].includes(post.props.post_status)) {
            this.addCap(results, postType, "delete_published_posts");
          } else if ("private" === post.props.post_status) {
            this.addCap(results, postType, "delete_private_posts");
          }
        }
        break;

      /*
       * edit_post breaks down to edit_posts, edit_published_posts, or
       * edit_others_posts.
       */
      case "edit_post":
      case "edit_page":
        if (!args[0]) {
          // When checking for the %s capability, you must always check it against a specific post.'
          results.add(DO_NOT_ALLOW);
          break;
        }

        post = await postUtil.get(args[0]);

        if (!post.props?.ID) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        if ("revision" === post.props.post_type) {
          post = await postUtil.get(post.props.post_parent);
          if (!post.props?.ID) {
            results.add(DO_NOT_ALLOW);
            break;
          }
        }

        postType = postUtil.getTypeObject(post.props.post_type);

        if (!postType) {
          // 'The post type %1$s is not registered,
          // so it may not be reliable to check the capability %2$s against a post of that type.'
          results.add("edit_others_posts");
          break;
        }

        if (!postType.mapMetaCap) {
          this.addCap(results, postType, action);
          break;
        }

        // If the post author is set and the user is the author...
        if (
          post.props.post_author &&
          user.props?.ID == post.props.post_author
        ) {
          // If the post is published or scheduled...
          if (["publish", "future"].includes(post.props.post_status)) {
            this.addCap(results, postType, "edit_published_posts");
          } else if ("trash" === post.props.post_status) {
            const postStatus = await post.meta.get("_wp_trash_meta_status");
            if (postStatus && ["publish", "future"].includes(postStatus)) {
              this.addCap(results, postType, "edit_published_posts");
            } else {
              this.addCap(results, postType, "edit_posts");
            }
          } else {
            // If the post is draft...
            this.addCap(results, postType, "edit_posts");
          }
        } else {
          // The user is trying to edit someone else's post.
          this.addCap(results, postType, "edit_others_posts");
          // The post is published or scheduled, extra cap required.
          if (["publish", "future"].includes(post.props.post_status)) {
            this.addCap(results, postType, "edit_published_posts");
          } else if ("private" === post.props.post_status) {
            this.addCap(results, postType, "edit_private_posts");
          }
        }
        break;

      case "read_post":
      case "read_page":
        if (!args[0]) {
          // 'When checking for the %s capability, you must always check it against a specific post.'
          // 'When checking for the %s capability, you must always check it against a specific page.'
          results.add(DO_NOT_ALLOW);
          break;
        }

        post = await postUtil.get(args[0]);

        if (!post.props?.ID) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        if ("revision" === post.props.post_type) {
          post = await postUtil.get(post.props.post_parent);
          if (!post.props?.ID) {
            results.add(DO_NOT_ALLOW);
            break;
          }
        }

        postType = postUtil.getTypeObject(post.props.post_type);

        if (!postType) {
          // 'The post type %1$s is not registered,
          // so it may not be reliable to check the capability %2$s against a post of that type.'

          results.add("edit_others_posts");
          break;
        }

        if (!postType.mapMetaCap) {
          this.addCap(results, postType, action);
          break;
        }

        const postStatusObject = postUtil.getStatusObject(
          await postUtil.getStatus(post)
        );

        if (!postStatusObject) {
          // The post status %1$s is not registered,
          // so it may not be reliable to check the capability %2$s against a post with that status.
          results.add("edit_others_posts");
          break;
        }

        if (postStatusObject.public) {
          this.addCap(results, postType, "read");
          break;
        }

        if (
          post.props.post_author &&
          user.props?.ID == post.props.post_author
        ) {
          this.addCap(results, postType, "read");
        } else if (postStatusObject.private) {
          this.addCap(results, postType, "read_private_posts");
        } else {
          results = new Set(await this.check("edit_post", user, post.props.ID));
        }
        break;

      case "publish_post":
        if (!args[0]) {
          // 'When checking for the %s capability, you must always check it against a specific post.'
          results.add(DO_NOT_ALLOW);
          break;
        }

        post = await postUtil.get(args[0]);

        if (!post.props?.ID) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        postType = postUtil.getTypeObject(post.props.post_type);

        if (!postType) {
          // The post type %1$s is not registered,
          // so it may not be reliable to check the capability %2$s against a post of that type
          results.add("edit_others_posts");
          break;
        }

        this.addCap(results, postType, "publish_posts");
        break;

      case "edit_post_meta":
      case "delete_post_meta":
      case "add_post_meta":
      case "edit_comment_meta":
      case "delete_comment_meta":
      case "add_comment_meta":
      case "edit_term_meta":
      case "delete_term_meta":
      case "add_term_meta":
      case "edit_user_meta":
      case "delete_user_meta":
      case "add_user_meta":
        const objectType = action.split("_")[1] ?? "";

        if (!args[0]) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        const objectId = parseInt(args[0]);
        const objectSubType = await metaUtil.getObjectSubtype(
          objectType,
          objectId
        );

        if (!objectSubType) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        results = new Set(
          await this.check(`edit_${objectType}`, user, objectId)
        );
        if (typeof args[1] == "string" && metaUtil.isProtected(args[1])) {
          results.add(action);
        }

        break;

      case "edit_comment":
        if (!args[0]) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        const comment = await commentUtil.get(args[0]);

        if (!comment.props?.comment_ID) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        post = await postUtil.get(comment.props.comment_post_ID);

        /*
         * If the post doesn't exist, we have an orphaned comment.
         * Fall back to the edit_posts capability, instead.
         */
        if (post.props?.ID) {
          results = new Set(await this.check("edit_post", user, post.props.ID));
        } else {
          results = new Set(await this.check("edit_posts", user));
        }
        break;

      case "unfiltered_upload":
        if (
          this.config.config.constants.ALLOW_UNFILTERED_UPLOADS &&
          (!this.config.isMultiSite() || role.isSuperAdmin())
        ) {
          results.add(action);
        } else {
          results.add(DO_NOT_ALLOW);
        }
        break;

      case "edit_css":
      case "unfiltered_html":
        // Disallow unfiltered_html for all users, even admins and super admins.
        if (this.config.config.constants.DISALLOW_UNFILTERED_HTML) {
          results.add(DO_NOT_ALLOW);
        } else if (this.config.isMultiSite() && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
        } else {
          results.add("unfiltered_html");
        }
        break;

      case "edit_files":
      case "edit_plugins":
      case "edit_themes":
        // Disallow the file editors.
        if (this.config.config.constants.DISALLOW_FILE_EDIT) {
          results.add(DO_NOT_ALLOW);
        } else if (this.config.isMultiSite() && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
        } else {
          results.add(action);
        }
        break;

      case "update_plugins":
      case "delete_plugins":
      case "install_plugins":
      case "upload_plugins":
      case "update_themes":
      case "delete_themes":
      case "install_themes":
      case "upload_themes":
      case "update_core":
        /*
         * Disallow anything that creates, deletes, or updates core, plugin, or theme files.
         * Files in uploads are excepted.
         */
        if (this.config.isMultiSite() && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
        } else if ("upload_themes" === action) {
          results.add("install_themes");
        } else if ("upload_plugins" === action) {
          results.add("install_plugins");
        } else {
          results.add(action);
        }
        break;
      case "install_languages":
      case "update_languages":
        if (this.config.isMultiSite() && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
        } else {
          results.add("install_languages");
        }
        break;

      case "activate_plugins":
      case "deactivate_plugins":
      case "activate_plugin":
      case "deactivate_plugin":
        results.add("activate_plugins");
        if (this.config.isMultiSite()) {
          // update_, install_, and delete_ are handled above with is_super_admin().
          const menuPerms = await options.get<any>("menu_items", {
            siteId: current.site?.props.site?.id,
            default: {},
          });
          if (Array.isArray(menuPerms?.plugins)) {
            results.add("manage_network_plugins");
          }
        }
        break;

      case "resume_plugin":
        results.add("resume_plugins");
        break;
      case "resume_theme":
        results.add("resume_themes");
        break;
      case "delete_user":
      case "delete_users":
        // If multisite only super admins can delete users.
        if (this.config.isMultiSite() && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        if (action == "delete_user") {
          const context = vars.CONTEXT;
          results = await context.hooks.filter.asyncApply(
            "core_map_meta_cap_delete_user",
            results,
            context,
            user,
            ...args
          );
        }

        results.add("delete_users"); // delete_user maps to delete_users.

        break;

      case "create_users":
        if (!this.config.isMultiSite()) {
          results.add(action);
        } else if (
          role.isSuperAdmin() ||
          1 ===
            (await options.get<number>("add_new_users", {
              siteId: current.site?.props.site?.id,
            }))
        ) {
          results.add(action);
        } else {
          results.add(DO_NOT_ALLOW);
        }
        break;

      case "manage_links":
        if (await options.get("link_manager_enabled")) {
          results.add(action);
        } else {
          results.add(DO_NOT_ALLOW);
        }
        break;
      case "customize":
        results.add("edit_theme_options");
        break;
      case "delete_site":
        if (this.config.isMultiSite()) {
          results.add("manage_options");
        } else {
          results.add(DO_NOT_ALLOW);
        }
        break;

      case "edit_term":
      case "delete_term":
      case "assign_term":
        if (!args[0]) {
          // 'When checking for the %s capability, you must always check it against a specific term.'
          results.add(DO_NOT_ALLOW);
          break;
        }

        const term = await termUtil.get(args[0]);

        if (!term.props?.term_id) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        const taxonomy = await taxonomyUtil.get(term.props.taxonomy ?? "");
        if (taxonomy.isDefault) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        if (
          "delete_term" === action &&
          ((await options.get<number>(`default_${term.props.taxonomy}`)) ==
            term.props.term_id ||
            (await options.get<number>(
              `default_term_${term.props.taxonomy}`
            )) == term.props.term_id)
        ) {
          results.add(DO_NOT_ALLOW);
          break;
        }

        results = new Set(
          await this.check(
            taxonomy.props?.capabilities?.[
              `${action}s` as types.TaxonomyCapability
            ],
            user,
            term.props.term_id
          )
        );
        break;

      case "manage_post_tags":
      case "edit_categories":
      case "edit_post_tags":
      case "delete_categories":
      case "delete_post_tags":
        results.add("manage_categories");
        break;
      case "assign_categories":
      case "assign_post_tags":
        results.add("edit_posts");
        break;
      case "create_sites":
      case "delete_sites":
      case "manage_network":
      case "manage_sites":
      case "manage_network_plugins":
      case "manage_network_themes":
      case "manage_network_options":
      case "upgrade_network":
        results.add(action);
        break;

      case "manage_network_users":
        const context = vars.CONTEXT;
        results = await context.hooks.filter.asyncApply(
          "core_map_meta_cap_manage_network_users",
          results,
          context,
          user,
          ...args
        );
        if (
          this.config.isMultiSite() &&
          !results.has("manage_network_users") &&
          !results.has(DO_NOT_ALLOW)
        ) {
          results.add("manage_network_users");
        }
        break;

      case "setup_network":
        if (this.config.isMultiSite()) {
          results.add("manage_network_options");
        } else {
          results.add("manage_options");
        }
        break;
      case "update_php":
        if (this.config.isMultiSite() && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
        } else {
          results.add("update_core");
        }
        break;
      case "update_https":
        if (this.config.isMultiSite() && !role.isSuperAdmin()) {
          results.add(DO_NOT_ALLOW);
        } else {
          results.add("manage_options");
          results.add("update_core");
        }
        break;

      case "export_others_personal_data":
      case "erase_others_personal_data":
      case "manage_privacy_options":
        results.add(
          this.config.isMultiSite() ? "manage_network" : "manage_options"
        );
        break;

      case "create_app_password":
      case "list_app_passwords":
      case "read_app_password":
      case "edit_app_password":
      case "delete_app_passwords":
      case "delete_app_password":
        results = new Set(await this.check("edit_user", user, args[0]));
        break;

      default:
        // Handle meta capabilities for custom post types.
        postType = postUtil.getTypeObject("post");
        if (
          postType?.capabilities &&
          postType?.capabilities[action] &&
          action != postType?.capabilities[action]
        ) {
          results = new Set(
            await this.check(postType.capabilities[action], user, ...args)
          );
          break;
        }

        // Block capabilities map to their post equivalent.
        const blockCaps = [
          "edit_blocks",
          "edit_others_blocks",
          "publish_blocks",
          "read_private_blocks",
          "delete_blocks",
          "delete_private_blocks",
          "delete_published_blocks",
          "delete_others_blocks",
          "edit_private_blocks",
          "edit_published_blocks",
        ];
        if (blockCaps.includes(action)) {
          action = action.replace("_blocks", "_posts");
        }

        // If no meta caps match, return the original cap.
        results.add(action);
    }

    const context = vars.CONTEXT;
    results = await context.hooks.filter.asyncApply(
      "core_map_meta_cap",
      results,
      context,
      action,
      user,
      ...args
    );

    return Array.from(results);
  }
}
