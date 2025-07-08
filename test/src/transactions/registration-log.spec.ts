import Application from "@rnaga/wp-node/application";
import { BlogUtil } from "@rnaga/wp-node/core/utils/blog.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { UserUtil } from "@rnaga/wp-node/core/utils/user.util";
import { RegistrationLogTrx } from "@rnaga/wp-node/transactions";
import * as val from "@rnaga/wp-node/validators";

test("insert", async () => {
  const context = await Application.getContext("multi");
  const registrationLogTrx = context.components.get(RegistrationLogTrx);
  const queryUtil = context.components.get(QueryUtil);

  const user = await context.components.get(UserUtil).get(1);
  const blog = await context.components.get(BlogUtil).get(1);

  let id = 0;
  try {
    // This is already added
    id =
      (await registrationLogTrx.insert(blog, user, {
        ip: "192.168.0.1",
      })) ?? 0;
  } catch (e) {
    console.log(e);
  }

  expect(id > 0).toBe(true);

  const log = await queryUtil.common(
    "registration_log",
    (query) => {
      query.where("ID", id).builder.first();
    },
    val.database.wpRegistrationLog
  );

  expect(log?.blog_id).toBe(blog.props?.blog_id);
  expect(log?.ID).toBe(id);
});
