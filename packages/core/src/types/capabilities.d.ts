import { ROLE_CAPABILITY_ACTIONS, ROLE_CAPABILITIES } from "../constants";

export interface MapMetaCapArgs {
  edit_user: [userId: number] | [];
  remove_user: [userId: number] | [];
  delete_post: [postId: number];
  delete_page: [postId: number];
  edit_post: [postId: number];
  edit_page: [postId: number];
  read_post: [postId: number];
  read_page: [postId: number];
  publish_post: [postId: number];
  publish_page: [postId: number];
  edit_post_meta: [objectId: number];
  delete_post_meta: [objectId: number];
  add_post_meta: [objectId: number];
  edit_comment_meta: [objectId: number];
  delete_comment_meta: [objectId: number];
  add_comment_meta: [objectId: number];
  edit_term_meta: [objectId: number];
  delete_term_meta: [objectId: number];
  add_term_meta: [objectId: number];
  edit_user_meta: [objectId: number];
  delete_user_meta: [objectId: number];
  add_user_meta: [objectId: number];
  edit_comment: [commentId: number];
  edit_term: [termId: number];
  delete_term: [termId: number];
  assign_term: [termId: number];
  create_app_password: [userId: number] | [];
  list_app_passwords: [userId: number] | [];
  read_app_password: [userId: number] | [];
  edit_app_password: [userId: number] | [];
  delete_app_passwords: [userId: number] | [];
  delete_app_password: [userId: number] | [];

  // In filter
  create_users: [siteIds: number[]] | [];
  edit_admin_roles: [blogId: number] | [];
  edit_user_roles: [blogIds: number[]] | [];
  manage_roles: [blogId: number] | [];

  delete_user: [targetUserId: number];
  manage_network_users: [blogIds: number[]] | [];
  manage_network_user: [userId: number[]] | [];
  manage_network: [siteIds: number[]] | [];
  manage_network_options: [siteIds: number[]] | [];

  manage_sites: [blogIds: number[]] | [];
  delete_sites: [blogIds: number[]] | [];
  create_sites: [blogIds: number[]] | [];
  manage_options: [blogIds: number[]] | [];

  manage_blog_users: [blogIds: number[]] | [];
  manage_site_users: [siteIds: number[]] | [];

  list_blog_users: [blogIds: number[]] | [];
}

export type MapMetaCapArgsKeys = keyof MapMetaCapArgs;

export type RoleCapabilityActions =
  | (typeof ROLE_CAPABILITY_ACTIONS)[number]
  | (typeof ROLE_CAPABILITIES)[number]
  | MapMetaCapArgsKeys;

export type TMapMetaCapArgs<T> = T extends keyof MapMetaCapArgs
  ? MapMetaCapArgs[T] extends Array<any> | undefined
    ? MapMetaCapArgs[T]
    : any
  : any;
