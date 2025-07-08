import { z } from "zod";

import { formatting, generatePassword, hashPassword } from "../common/";
import { Config } from "../config";
import { Components } from "../core/components";
import { Current } from "../core/current";
import { Logger } from "../core/logger";
import { Options } from "../core/options";
import { User } from "../core/user";
import { BlogUtil } from "../core/utils/blog.util";
import { QueryUtil } from "../core/utils/query.util";
import { RolesUtil } from "../core/utils/roles.util";
import { UserUtil } from "../core/utils/user.util";
import { Validator } from "../core/validator";
import { Vars } from "../core/vars";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { BlogTrx } from "./blog.trx";
import { LinkTrx } from "./link.trx";
import { MetaTrx } from "./meta.trx";
import { PostTrx } from "./post.trx";
import { Trx } from "./trx";

import type * as types from "../types";
type DataUpsert = z.infer<typeof val.trx.userUpsert>;
type Data = Partial<DataUpsert> &
  Required<
    Pick<
      DataUpsert,
      "ID" | "user_url" | "user_registered" | "user_activation_key"
    >
  >;

type MetaInput = Pick<
  DataUpsert,
  | "nickname"
  | "first_name"
  | "last_name"
  | "description"
  | "rich_editing"
  | "syntax_highlighting"
  | "comment_shortcuts"
  | "admin_color"
  | "use_ssl"
  | "show_admin_bar_front"
  | "locale"
> &
  Record<string, any>;

@transactions()
export class UserTrx extends Trx {
  constructor(
    private database: Database,
    private logger: Logger,
    private components: Components,
    private config: Config,
    private validator: Validator,
    private vars: Vars
  ) {
    super(components);
  }

  // wpmu_create_user
  //
  async upsert(
    input: Partial<DataUpsert>,
    options?: {
      attachRole?: boolean;
      removeRole?: boolean;
    }
  ) {
    const { attachRole = true, removeRole = false } = options ?? {};
    const userUtil = this.components.get(UserUtil);

    let update = false;
    let userBefore: User | undefined = undefined;

    if (input.ID) {
      update = true;

      userBefore = await userUtil.get(input.ID);
      const roleBefore = await userBefore.role();
      if (!userBefore.props) {
        throw Error(`User not found - ${input.ID}`);
      }

      // Combine input with existing record
      input = {
        ...(userBefore.props as any),
        ...(await userBefore.meta.props()),
        role: Array.from(roleBefore.names),
        ...input,
      };
    }

    const queryUtil = this.components.get(QueryUtil);
    const parsedInput = val.trx.userUpsert.parse(input);

    const data: Data = {
      ID: parsedInput.ID ?? 0,
      user_url: parsedInput.user_url ?? "",
      user_registered: parsedInput.user_registered ?? formatting.dateMySQL(),
      user_activation_key: parsedInput.user_activation_key,
      first_name: parsedInput.first_name,
      user_pass: parsedInput?.user_pass ?? "",
    };

    let metaInput: MetaInput = {
      nickname: parsedInput.nickname,
      comment_shortcuts: parsedInput.comment_shortcuts,
      first_name: parsedInput.first_name,
      last_name: parsedInput.last_name,
      description: parsedInput.description,
      rich_editing: parsedInput.rich_editing,
      syntax_highlighting: parsedInput.syntax_highlighting,
      admin_color: parsedInput.admin_color.replace(/[^a-z0-9 _.\-@]/gi, ""),
      use_ssl: parsedInput.use_ssl,
      show_admin_bar_front: parsedInput.show_admin_bar_front,
      locale: parsedInput.locale,
    };

    if (!update) {
      data.user_login = val.trx.userLogin.parse(parsedInput.user_login);
      data.user_pass = hashPassword(parsedInput.user_pass);
    }

    data.user_login = formatting.username(parsedInput.user_login);

    if (0 >= data.user_login.length || 60 < data.user_login.length) {
      throw new Error(`user_loign is too short or long - ${data.user_login}`);
    }

    const userLogin = parsedInput.user_login;

    if (0 <= metaInput.nickname.length) {
      metaInput.nickname = userLogin;
    }

    if (
      !update &&
      (await queryUtil.users((query) => query.where("user_login", userLogin)))
    ) {
      throw new Error(`username already exists - ${userLogin}`);
    }

    /*
     * If a nicename is provided, remove unsafe user characters before using it.
     * Otherwise build a nicename from the user_login.
     */
    const userNicename =
      0 < parsedInput.user_nicename.length
        ? formatting.username(parsedInput.user_nicename, true)
        : userLogin.substring(0, 50);

    data.user_nicename = await userUtil.getUniqueNicename(
      userNicename,
      userLogin
    );

    /*
     * If there is no update, just check for `email_exists`. If there is an update,
     * check if current email and new email are the same, and check `email_exists`
     * accordingly.
     */
    if (
      (!update ||
        (userBefore &&
          parsedInput.user_email !== userBefore.props?.user_email)) &&
      (await queryUtil.users((query) =>
        query.where("user_email", parsedInput.user_email)
      ))
    ) {
      throw new Error(
        `Email is already used - ${parsedInput.user_email} ${
          userBefore ? userBefore.props?.user_email : ""
        }`
      );
    }

    data.user_email = parsedInput.user_email;

    if (100 < data.user_url.length) {
      throw new Error(`user url is too long - ${data.user_url}`);
    }

    if (parsedInput.spam && !this.config.isMultiSite()) {
      throw new Error("Marking a user as spam is only supported on Multisite.");
    }

    if (this.config.isMultiSite()) {
      data.spam = parsedInput.spam ?? 0;
    }

    metaInput.nickname = parsedInput.nickname ?? userLogin;

    data.display_name = parsedInput.display_name;

    if (0 === data.display_name.length) {
      data.display_name =
        `${metaInput.first_name} ${metaInput.last_name}`.trim();
    }

    if (0 === data.display_name.length) {
      data.display_name = userLogin;
    }

    let dataUpsert: any = {};

    try {
      dataUpsert = this.validator.execAny(
        update ? val.trx.userUpdate : val.trx.userInsert,
        Object.entries(data)
          .map(([key, value]) => ({
            [key]: formatting.unslash(value),
          }))
          .reduce((obj, item) => ({ ...obj, ...item }), {})
      );
    } catch (e) {
      this.logger.warn(`parse error: ${e}`, { data });
      throw e;
    }

    if (!dataUpsert) {
      throw new Error(`Invalid post data - ${JSON.stringify(data)}`);
    }

    if (this.config.isMultiSite()) {
      dataUpsert.spam = data.spam;
    }

    const trx = await this.database.transaction;
    try {
      if (update) {
        if (
          userBefore &&
          (data.user_email !== userBefore.props?.user_email ||
            data.user_pass !== userBefore.props.user_pass)
        ) {
          dataUpsert.user_activation_key = "";
        }
        await trx
          .table(this.tables.get("users"))
          .where("ID", data.ID)
          .update(dataUpsert);
      } else {
        await trx
          .insert(dataUpsert)
          .into(this.tables.get("users"))
          .then((v) => {
            data.ID = v[0];
          });
      }
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert user - ${e}`);
    }
    await trx.commit();

    const user = await userUtil.get(data.ID);
    if (!user.props) {
      throw new Error(`User not found - ${data.ID}`);
    }

    const userId = user.props.ID;

    metaInput = { ...metaInput, ...parsedInput.meta_input };

    const metaTrx = this.components.get(MetaTrx);
    for (const [key, value] of Object.entries(metaInput)) {
      if (!value) {
        continue;
      }
      await metaTrx.upsert("user", userId, key, value, {
        serialize: typeof value == "object" || Array.isArray(value),
      });
    }

    if (update && removeRole) {
      await this.removeRole(userId);
    } else if (attachRole) {
      await this.upsertRole(userId, parsedInput.role);
    }

    return userId;
  }

  async upsertRole(
    userId: number,
    roleNameOrNames?: types.UpsertRoleName
  ): Promise<boolean>;
  async upsertRole(userId: number, roleNameOrNames?: string): Promise<boolean>;
  async upsertRole(
    userId: number,
    roleNameOrNames?: string[]
  ): Promise<boolean>;
  async upsertRole(
    userId: number,
    roleNameOrNames?: types.UpsertRoleName[]
  ): Promise<boolean>;
  async upsertRole(userId: number, roleNameOrNames?: any) {
    const optionsComponent = this.components.get(Options);

    let roleNames = {};

    if (!roleNameOrNames) {
      roleNameOrNames =
        (await optionsComponent.get("default_role")) ?? "subscriber";
    }

    if ("string" === typeof roleNameOrNames) {
      roleNames = { [roleNameOrNames]: true };
    } else if (Array.isArray(roleNameOrNames)) {
      for (const roleName of roleNameOrNames) {
        roleNames = { ...roleNames, [roleName]: true };
      }
    }

    const metaTrx = this.components.get(MetaTrx);
    const result = await metaTrx.upsert(
      "user",
      userId,
      `${this.tables.prefix}capabilities`,
      roleNames,
      {
        serialize: true,
      }
    );

    return result;
  }

  async syncSuperAdmin(
    userId: number,
    options?: Partial<{
      siteId: number;
      blogId: number;
      remove: boolean;
    }>
  ) {
    const userUtil = this.components.get(UserUtil);
    const { remove = false, blogId } = options ?? {};
    let { siteId } = options ?? {};

    if (blogId) {
      const blogUtil = this.components.get(BlogUtil);
      const blog = await blogUtil.get(blogId);

      if (!blog.props?.site_id) {
        throw new Error("Invalid Blog");
      }
      siteId = blog.props?.site_id;
    }

    if (!siteId) {
      const current = this.components.get(Current);
      siteId = current.siteId;
    }

    const user = await userUtil.get(userId);
    if (!user.props?.user_login) {
      throw new Error("User not found");
    }

    const userLogin = user.props.user_login;

    const metaTrx = this.components.get(MetaTrx);
    const rolesUtil = this.components.get(RolesUtil);
    const superAdmins = await rolesUtil.getSuperAdmins({
      siteId,
    });

    const newSuperAdmins = new Set<string>();

    if (remove) {
      // Skip if there's only one super admin in site.
      // i.e. make sure there's at least one super admin.
      superAdmins.length > 1 &&
        superAdmins.map(
          (superAdmin) =>
            superAdmin !== userLogin && newSuperAdmins.add(superAdmin)
        );
    } else {
      superAdmins.map((superAdmin) => newSuperAdmins.add(superAdmin));
      newSuperAdmins.add(userLogin);
    }

    newSuperAdmins.size > 0 &&
      newSuperAdmins.size !== superAdmins.length &&
      (await metaTrx.upsert(
        "site",
        siteId,
        "site_admins",
        Array.from(newSuperAdmins),
        {
          serialize: true,
        }
      ));
  }

  // wp_delete_user
  async remove(userId: number, reassign?: number) {
    const userUtil = this.components.get(UserUtil);
    const queryUtil = this.components.get(QueryUtil);
    const user = await userUtil.get(userId);

    if (!user.props) {
      throw new Error(`User not found - ${userId}`);
    }

    let reassignUser: User | undefined = undefined;
    if (reassign) {
      reassignUser = await userUtil.get(reassign);
      if (!reassignUser.props) {
        throw new Error(`User not found - ${reassign}`);
      }
    }

    const postTypeObject = this.config.config.posts.types;
    if (!reassign) {
      const postTypesToDelete: string[] = [];
      for (const [type, typeObject] of Object.entries(postTypeObject)) {
        if (
          typeObject.deleteWithUser ||
          typeObject.supports.includes("author")
        ) {
          postTypesToDelete.push(type);
        }
      }

      const postsToDelete =
        (await queryUtil.posts((query) => {
          query
            .where("post_author", userId)
            .whereIn("post_type", postTypesToDelete);
        })) ?? [];

      const postTrx = this.components.get(PostTrx);
      for (const post of postsToDelete) {
        await postTrx.remove(post.ID);
      }

      const linksToDelete =
        (await queryUtil.common("links", (query) => {
          query.where("link_owner", userId);
        })) ?? [];

      const linkTrx = this.components.get(LinkTrx);
      for (const link of linksToDelete) {
        await linkTrx.remove(link.link_id);
      }
    } else {
      const postTrx = this.components.get(PostTrx);
      const linkTrx = this.components.get(LinkTrx);

      // Re-assign posts and links
      await postTrx.changeAuthor(userId, reassign);
      await linkTrx.changeUser(userId, reassign);
    }

    // FINALLY, delete user.
    if (this.config.isMultiSite()) {
      const blogTrx = this.components.get(BlogTrx);
      const current = this.components.get(Current);
      await blogTrx.removeUser(current.blogId, userId);
    } else {
      await this.removeMeta(user);

      const trx = await this.database.transaction;
      try {
        await trx.table(this.tables.get("users")).where("ID", userId).del();
      } catch (e) {
        await trx.rollback();
        throw new Error("Failed to delete user");
      }
      await trx.commit();
    }

    return true;
  }

  // Remove user from entire blogs
  async removeFromAllBlogs(
    userId: number,
    reassignList?: Record<number, number> // <blogId, userId to reassign>
  ) {
    if (!this.config.isMultiSite()) {
      throw new Error("Multisite mode is disabled");
    }

    const userUtil = this.components.get(UserUtil);
    const sites = await userUtil.getSites(userId);

    const CONTEXT = this.vars.CONTEXT;
    for (const site of sites.sites ?? []) {
      for (const blog of site.blogs ?? []) {
        const blogId = blog.blog_id;
        const siteId = blog.site_id;

        const clonedContext = await CONTEXT.clone();
        await clonedContext.current.switchSite(siteId, blogId);

        const reassign = reassignList ? reassignList[blogId] : undefined;
        await clonedContext.utils.trx.user.remove(userId, reassign);
      }
    }

    // Remove user meta
    await this.removeMeta(userId);

    // Remove user wp_users
    const trx = await this.database.transaction;
    try {
      await trx.table(this.tables.get("users")).where("ID", userId).del();
    } catch (e) {
      await trx.rollback();
      throw new Error("Failed to delete user");
    }
    await trx.commit();

    return true;
  }

  async removeMeta(userIdOrUser: number | User) {
    const userUtil = this.components.get(UserUtil);
    const queryUtil = this.components.get(QueryUtil);
    const user =
      typeof userIdOrUser === "number"
        ? await userUtil.get(userIdOrUser)
        : userIdOrUser;

    if (!user.props) {
      throw new Error("User not found");
    }

    const userId = user.props.ID;

    const metaToDelete =
      (await queryUtil.meta("user", (query) => {
        query.withIds([userId]);
      })) ?? [];

    const metaTrx = this.components.get(MetaTrx);
    for (const meta of metaToDelete) {
      if (typeof meta.meta_key !== "string") {
        continue;
      }
      await metaTrx.remove("user", {
        key: meta.meta_key,
        objectId: userId,
      });
    }
  }

  async removeRole(
    userId: number,
    options?: Partial<{
      removeSuperAdmin: boolean;
    }>
  ) {
    const metaTrx = this.components.get(MetaTrx);
    const { removeSuperAdmin = true } = options ?? {};

    // Remove from super admins list
    if (removeSuperAdmin) {
      await this.syncSuperAdmin(userId, {
        remove: true,
      });
    }

    return await metaTrx.remove("user", {
      objectId: userId,
      key: `${this.tables.prefix}capabilities`,
    });
  }

  // register_new_user
  async registerNew(userLogin: string, email: string) {
    userLogin = formatting.username(userLogin);
    if (0 >= userLogin.length) {
      throw new Error(`Please enter a username.`);
    }

    const userUtil = this.components.get(UserUtil);
    let user = await userUtil.get(userLogin);
    if (user.props) {
      throw new Error(`This username is already registered. - ${userLogin}`);
    }

    // Check the email address.
    if (0 >= email.length) {
      throw new Error(`Please type your email address.`);
    }

    if (!this.validator.fieldSafe("users", "user_email", email)) {
      throw new Error(`The email address is not correct. - ${email}`);
    }

    user = await userUtil.get(email);
    if (user.props) {
      throw new Error(`This email address is already registered. - ${email}`);
    }

    const userIdOrError = await this.upsert({
      user_login: userLogin,
      user_email: email,
    }).catch((e) => e);

    if (typeof userIdOrError !== "number") {
      throw new Error(userIdOrError);
    }

    const userId = userIdOrError as number;
    const metaTrx = this.components.get(MetaTrx);
    await metaTrx.upsert("user", userId, "default_password_nag", true); // Set up the password change nag.

    return userId;
  }

  // get_password_reset_key
  async resetActivationKey(user: User) {
    const userUtil = this.components.get(UserUtil);
    if (!user.props || !userUtil.isPasswordResetAllowed(user)) {
      throw new Error("Password reset is not allowed for this user");
    }

    // Generate something random for a password reset key.
    const resetKey = generatePassword(20, false);
    const hash = hashPassword(resetKey);
    const activationKey = `${Math.floor(Date.now() / 1000)}:${hash}`;

    try {
      await this.upsert({
        ID: user.props.ID,
        user_activation_key: activationKey,
      });
    } catch (e) {
      throw new Error(`Failed to save activation key - ${e}`);
    }

    return resetKey;
  }

  async revokeActivationKey(user: User) {
    if (!user.props) {
      throw new Error("Invalid User");
    }
    const userId = user.props?.ID;

    try {
      await this.upsert({
        ID: userId,
        user_activation_key: "",
      });
    } catch (e) {
      throw new Error(`Failed to revoke activation key - ${e}`);
    }
  }
}
