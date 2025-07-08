import { formatting } from "../common/formatting";
import { Blog } from "../core/blog";
import { Components } from "../core/components";
import { User } from "../core/user";
import { UserUtil } from "../core/utils/user.util";
import Database from "../database";
import { transactions } from "../decorators/component";
import * as val from "../validators";
import { Trx } from "./trx";

@transactions()
export class RegistrationLogTrx extends Trx {
  constructor(private database: Database, private components: Components) {
    super(components);
  }

  // wpmu_log_new_registrations
  async insert(
    blogOrId: Blog | number,
    userOrId: User | number,
    args: {
      ip: string;
    }
  ) {
    const user =
      userOrId instanceof User
        ? userOrId
        : await this.components.get(UserUtil).get(userOrId);

    if (!user.props) {
      return;
    }

    const blogId =
      blogOrId instanceof Blog ? blogOrId.props?.blog_id : blogOrId;

    const dataInsert = val.database.wpRegistrationLog.omit({ ID: true }).parse({
      email: user.props.user_email,
      IP: args.ip,
      blog_id: blogId,
      date_registered: formatting.dateMySQL(),
    });

    let id = 0;
    const trx = await this.database.transaction;
    try {
      await trx
        .insert(dataInsert)
        .into(this.tables.get("registration_log"))
        .then((v) => {
          id = v[0];
        });
    } catch (e) {
      await trx.rollback();
      throw new Error(`Failed to insert registration log - ${e}`);
    }
    await trx.commit();

    return id;
  }
}
