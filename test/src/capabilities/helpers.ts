/* eslint-disable prefer-const */
import Application from "@rnaga/wp-node/application";
import { Config } from "@rnaga/wp-node/config";
import { Capabilities } from "@rnaga/wp-node/core/capabilities";
import { Context } from "@rnaga/wp-node/core/context";
import { Query } from "@rnaga/wp-node/core/query";
import { User } from "@rnaga/wp-node/core/user";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";

const PREFIX = "wptest";
const SUFFIX = 0;

const SUPERADMIN = `wp-multi`;
const ADMIN = `${PREFIX}administrator${SUFFIX}`;
const EDITOR = `${PREFIX}editor${SUFFIX}`;
const CONTRIBUTOR = `${PREFIX}contributor${SUFFIX}`;
const SUBSCRIBER = `${PREFIX}subscriber${SUFFIX}`;

export const getPost = async (args: {
  context: Context;
  user: User;
  postType?: string;
  postStatus?: string;
}) => {
  const { context, user, postType, postStatus } = args;
  const posts = await context.components.get(QueryUtil).posts((query) => {
    query.where("post_author", user.props?.ID ?? "-1");
    if (postType) query.where("post_type", postType);
    if (postStatus) query.where("post_status", postStatus);

    query.builder.limit(1);
  });
  return posts ? posts[0] : undefined;
};

export const runSite = async (type: "multi" | "single") => {
  let context: Context;
  let cap: Capabilities;
  let config: Config;
  let query: Query;
  let superAdmin: User;
  let admin: User;
  let editor: User;
  let contributor: User;
  let subscriber: User;
  let userPostIDOne: User;
  let userCommentIDOne: User;

  context = await Application.getContext(type);
  cap = context.components.get(Capabilities);
  query = context.components.get(Query);
  config = context.components.get(Config);

  superAdmin = await context.components.asyncGet(User, [`${SUPERADMIN}`]);
  admin = await context.components.asyncGet(User, [`${ADMIN}`]);
  editor = await context.components.asyncGet(User, [`${EDITOR}`]);
  contributor = await context.components.asyncGet(User, [`${CONTRIBUTOR}`]);
  subscriber = await context.components.asyncGet(User, [`${SUBSCRIBER}`]);

  const postIDOne = await context.components.get(QueryUtil).posts((query) => {
    query.where("ID", 1);
    query.builder.limit(1);
  });

  userPostIDOne = await context.components.asyncGet(User, [
    postIDOne ? postIDOne[0].post_author : -1,
  ]);

  const commentIDOne = await context.components
    .get(QueryUtil)
    .comments((query) => {
      query.where("ID", 1);
      query.builder.limit(1);
    });

  userCommentIDOne = await context.components.asyncGet(User, [
    commentIDOne ? commentIDOne[0].comment_post_ID : -1,
  ]);

  return {
    context,
    cap,
    config,
    query,
    users: {
      superAdmin,
      admin,
      editor,
      contributor,
      subscriber,
      userPostIDOne,
      userCommentIDOne,
    },
  };
};
