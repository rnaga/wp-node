import { UserUtil } from "../core/utils/user.util";
import { User } from "../core/user";
export type UserAvailableSites = Awaited<
  ReturnType<InstanceType<typeof UserUtil>["getSites"]>
>["sites"];

export type UserPrimaryBlog = Awaited<
  ReturnType<InstanceType<typeof UserUtil>["getSites"]>
>["primary_blog"];

export type NonNullableUser = Omit<User, "props"> &
  NonNullable<Pick<User, "props">>;
