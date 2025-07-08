import { BlogCrud } from "../crud/blog.crud";
import { CommentCrud } from "../crud/comment.crud";
import { MetaCrud } from "../crud/meta.crud";
import { OptionsCrud } from "../crud/options.crud";
import { PostCrud } from "../crud/post.crud";
import { SiteCrud } from "../crud/site.crud";
import { SettingsCrud } from "../crud/settings.crud";
import { TermCrud } from "../crud/term.crud";
import { UserCrud } from "../crud/user.crud";
import { CrudUtil } from "../core/utils/crud.util";
import { Crud } from "../crud/crud";
import { RevisionCrud } from "../crud/revision.crud";
import { RolesCrud } from "../crud/roles.crud";
import { UserSelfRegistrationCrud } from "../crud/user-self-registration.crud";

export type ParseError = ReturnType<CrudUtil["parseError"]>;

type Operation =
  | "list"
  | "create"
  | "get"
  | "getAsUpsert"
  | "update"
  | "delete";

export type CrudKeys =
  | "blog"
  | "comment"
  | "meta"
  | "options"
  | "post"
  | "site"
  | "term"
  | "settings"
  | "user"
  | "revision"
  | "roles";

type Context = "view" | "edit" | "embed";

interface CrudComponents {
  blog: BlogCrud;
  comment: CommentCrud;
  meta: MetaCrud;
  options: OptionsCrud;
  post: PostCrud;
  site: SiteCrud;
  term: TermCrud;
  settings: SettingsCrud;
  user: UserCrud;
  userSelfRegistration: UserSelfRegistrationCrud;
  revision: RevisionCrud;
  roles: RolesCrud;
}

// interface CrudOperations {
//   blog: Exclude<Operation, "getAsUpsert">;
//   comment: Operation;
//   meta: Extract<Operation, "create" | "get" | "update" | "delete">;
//   options: Extract<Operation, "get" | "update"> | "getAll";
//   post: Operation | "trash" | "untrash";
//   site: Exclude<Operation, "getAsUpsert">;
//   settings: Extract<Operation, "get" | "update">;
//   term: Exclude<Operation, "getAsUpsert"> | "taxonomies";
//   user:
//     | Operation
//     | "updatePassword"
//     | "updateRole"
//     | "updateSuperAdmin"
//     | "getAvailableSites"
//     | "getBlogs";
//   revision: Extract<Operation, "get" | "list">;
//   roles: Exclude<Operation, "get" | "getAsUpsert"> | "count";
// }

export type CrudParameters<
  Component extends keyof CrudComponents,
  Operation extends keyof CrudComponents[Component]
> = CrudComponents[Component][Operation] extends (...args: any) => any
  ? Parameters<CrudComponents[Component][Operation]>
  : never;

export type CrudReturnType<
  Component extends keyof CrudComponents,
  Operation extends keyof CrudComponents[Component]
> = CrudComponents[Component][Operation] extends (...args: any) => any
  ? Awaited<ReturnType<CrudComponents[Component][Operation]>>
  : never;

export type BlogOperations = Exclude<Operation, "getAsUpsert">;

export type BlogParams<T extends BlogOperations> = {
  list: Parameters<BlogCrud["list"]>;
  create: Parameters<BlogCrud["create"]>;
  get: Parameters<BlogCrud["get"]>;
  update: Parameters<BlogCrud["update"]>;
  delete: Parameters<BlogCrud["delete"]>;
}[T];

export type CommentOperations = Operation;

export type CommentParams<T extends CommentOperations> = {
  list: Parameters<CommentCrud["list"]>;
  create: Parameters<CommentCrud["create"]>;
  get: Parameters<CommentCrud["get"]>;
  getAsUpsert: Parameters<CommentCrud["getAsUpsert"]>;
  update: Parameters<CommentCrud["update"]>;
  delete: Parameters<CommentCrud["delete"]>;
}[T];

export type MetaOperations = Extract<
  Operation,
  "create" | "get" | "update" | "delete"
>;

export type MetaParams<T extends MetaOperations> = {
  create: Parameters<MetaCrud["create"]>;
  get: Parameters<MetaCrud["get"]>;
  update: Parameters<MetaCrud["update"]>;
  delete: Parameters<MetaCrud["delete"]>;
}[T];

export type OptionsOperations = Extract<Operation, "get" | "update"> | "getAll";

export type OptionsParams<T extends OptionsOperations> = {
  get: Parameters<OptionsCrud["get"]>;
  getAll: Parameters<OptionsCrud["getAll"]>;
  update: Parameters<OptionsCrud["update"]>;
}[T];

export type PostOperations = Operation;

export type PostParams<T extends PostOperations> = {
  list: Parameters<PostCrud["list"]>;
  create: Parameters<PostCrud["create"]>;
  get: Parameters<PostCrud["get"]>;
  getAsUpsert: Parameters<PostCrud["getAsUpsert"]>;
  update: Parameters<PostCrud["update"]>;
  delete: Parameters<PostCrud["delete"]>;
  trash: Parameters<PostCrud["trash"]>;
  untrash: Parameters<PostCrud["untrash"]>;
}[T];

export type SiteOperations = Exclude<Operation, "getAsUpsert">;

export type SiteParams<T extends SiteOperations> = {
  list: Parameters<SiteCrud["list"]>;
  create: Parameters<SiteCrud["create"]>;
  get: Parameters<SiteCrud["get"]>;
  update: Parameters<SiteCrud["update"]>;
  delete: Parameters<SiteCrud["delete"]>;
}[T];

export type SettingsOperations = Extract<Operation, "get" | "update">;

export type SettingsParams<T extends SettingsOperations> = {
  get: Parameters<SettingsCrud["get"]>;
  update: Parameters<SettingsCrud["update"]>;
}[T];

export type TermOperations = Exclude<Operation, "getAsUpsert"> | "taxonomies";

export type TermParams<T extends TermOperations> = {
  list: Parameters<TermCrud["list"]>;
  create: Parameters<TermCrud["create"]>;
  get: Parameters<TermCrud["get"]>;
  update: Parameters<TermCrud["update"]>;
  delete: Parameters<TermCrud["delete"]>;
  taxonomies: Parameters<TermCrud["taxonomies"]>;
}[T];

export type UserOperations =
  | Operation
  | "updatePassword"
  | "updateRole"
  | "updateSuperAdmin"
  | "getAvailableSites"
  | "getBlogs";

export type UserParams<T extends UserOperations> = {
  list: Parameters<UserCrud["list"]>;
  create: Parameters<UserCrud["create"]>;
  get: Parameters<UserCrud["get"]>;
  getAsUpsert: Parameters<UserCrud["getAsUpsert"]>;
  getAvailableSites: Parameters<UserCrud["getAvailableSites"]>;
  getBlogs: Parameters<UserCrud["getBlogs"]>;
  update: Parameters<UserCrud["update"]>;
  updatePassword: Parameters<UserCrud["updatePassword"]>;
  updateRole: Parameters<UserCrud["updateRole"]>;
  updateSuperAdmin: Parameters<UserCrud["updateSuperAdmin"]>;
  delete: Parameters<UserCrud["delete"]>;
}[T];

export type UserSelfRegistrationOperations =
  | "update"
  | "register"
  | "activate"
  | "registerWithoutActivation";

export type UserSelfRegistrationParams<
  T extends UserSelfRegistrationOperations
> = {
  update: Parameters<UserSelfRegistrationCrud["update"]>;
  register: Parameters<UserSelfRegistrationCrud["register"]>;
  activate: Parameters<UserSelfRegistrationCrud["activate"]>;
  registerWithoutActivation: Parameters<
    UserSelfRegistrationCrud["registerWithoutActivation"]
  >;
}[T];

export type RevisionOperations = Extract<Operation, "get" | "list">;

export type RevisionParams<T extends RevisionOperations> = {
  get: Parameters<RevisionCrud["get"]>;
  list: Parameters<RevisionCrud["list"]>;
}[T];

export type RolesOperations =
  | Extract<Operation, "create" | "list" | "update">
  | "count";

export type RolesParams<T extends RolesOperations> = {
  create: Parameters<RolesCrud["create"]>;
  list: Parameters<RolesCrud["list"]>;
  count: Parameters<RolesCrud["count"]>;
  update: Parameters<RolesCrud["update"]>;
  delete: Parameters<RolesCrud["delete"]>;
}[T];

export type Pagination = ReturnType<Crud["pagination"]>;
