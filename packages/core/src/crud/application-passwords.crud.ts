import { Components } from "../core/components";
import { ApplicationPasswordsUtil } from "../core/utils/application-passwords.util";
import { component } from "../decorators/component";
import { Crud } from "./crud";
import { CrudError, StatusMessage } from "./error";

@component()
export class ApplicationPasswordsCrud extends Crud {
  constructor(
    components: Components,
    private applicationPasswordsUtil: ApplicationPasswordsUtil
  ) {
    super(components);
  }

  async get(uuid: string) {
    const { user: currentUser } = await this.getUser();

    if (!(await currentUser?.can("read_app_password"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const password = await this.applicationPasswordsUtil.getUserPasswordByUuid(
      currentUser.props!.ID,
      uuid
    );
    if (!password) {
      throw new CrudError(StatusMessage.NOT_FOUND, "Password not found");
    }

    return this.returnValue(password);
  }

  async list() {
    const { user: currentUser } = await this.getUser();

    if (!(await currentUser?.can("list_app_passwords"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const passwords = await this.applicationPasswordsUtil.getUserPasswords(
      currentUser.props!.ID
    );

    return this.returnValue(passwords);
  }

  async create(data: { name: string; app_id?: string }) {
    const { user: currentUser } = await this.getUser();

    if (!(await currentUser?.can("create_app_password"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const password = await this.applicationPasswordsUtil.createNewPassword(
      currentUser.props!.ID,
      data
    );

    return this.returnValue(password);
  }

  async update(uuid: string, data: { name: string }) {
    const { user: currentUser } = await this.getUser();

    if (!(await currentUser?.can("edit_app_password"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const success = await this.applicationPasswordsUtil.updatePasswordName(
      currentUser.props!.ID,
      uuid,
      data.name
    );

    if (!success) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Failed to update password"
      );
    }

    return this.returnValue(success);
  }

  async delete(uuid: string) {
    const { user: currentUser } = await this.getUser();

    if (!(await currentUser?.can("delete_app_password"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }

    const success = await this.applicationPasswordsUtil.deletePassword(
      currentUser.props!.ID,
      uuid
    );

    if (!success) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Failed to delete password"
      );
    }

    return this.returnValue(success);
  }

  async deleteAll() {
    const { user: currentUser } = await this.getUser();
    if (!(await currentUser?.can("delete_app_passwords"))) {
      throw new CrudError(StatusMessage.UNAUTHORIZED, "Not permitted");
    }
    const success = await this.applicationPasswordsUtil.deleteAllPasswords(
      currentUser.props!.ID
    );
    if (!success) {
      throw new CrudError(
        StatusMessage.BAD_REQUEST,
        "Failed to delete passwords"
      );
    }
    return this.returnValue(success);
  }
}
