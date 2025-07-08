import { BlogCrud } from "../../crud/blog.crud";
import { CommentCrud } from "../../crud/comment.crud";
import { CrudError, StatusCodeMapper, StatusMessage } from "../../crud/error";
import { MetaCrud } from "../../crud/meta.crud";
import { OptionsCrud } from "../../crud/options.crud";
import { PostCrud } from "../../crud/post.crud";
import { RevisionCrud } from "../../crud/revision.crud";
import { RolesCrud } from "../../crud/roles.crud";
import { SettingsCrud } from "../../crud/settings.crud";
import { SiteCrud } from "../../crud/site.crud";
import { SitemetaCrud } from "../../crud/sitemeta.crud";
import { TermCrud } from "../../crud/term.crud";
import { UserSelfRegistrationCrud } from "../../crud/user-self-registration.crud";
import { UserCrud } from "../../crud/user.crud";
import { component } from "../../decorators/component";
import { Components } from "../components";

@component()
export class CrudUtil {
  constructor(private components: Components) {}

  parseError<T extends Error & CrudError>(e: T) {
    if (e?.statusCode) {
      return {
        status: {
          code: e.statusCode,
          message: StatusCodeMapper.getMessage(e.statusCode),
        },
        message: e.message,
      };
    }

    const statusMessage = StatusMessage.INTERNAL_SERVER_ERROR;
    return {
      status: {
        code: StatusCodeMapper.getCode(statusMessage),
        message: statusMessage,
      },
      message: e.message,
    };
  }

  get blog() {
    return this.components.get(BlogCrud);
  }

  get comment() {
    return this.components.get(CommentCrud);
  }

  get meta() {
    return this.components.get(MetaCrud);
  }

  get options() {
    return this.components.get(OptionsCrud);
  }

  get post() {
    return this.components.get(PostCrud);
  }

  get revision() {
    return this.components.get(RevisionCrud);
  }

  get roles() {
    return this.components.get(RolesCrud);
  }

  get settings() {
    return this.components.get(SettingsCrud);
  }

  get site() {
    return this.components.get(SiteCrud);
  }

  get sitemeta() {
    return this.components.get(SitemetaCrud);
  }

  get term() {
    return this.components.get(TermCrud);
  }

  get user() {
    return this.components.get(UserCrud);
  }

  get userSelfRegistration() {
    return this.components.get(UserSelfRegistrationCrud);
  }
}
