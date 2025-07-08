import { Scope } from "../../constants";
import { component } from "../../decorators/component";
import {
  BlogTrx,
  CommentTrx,
  LinkTrx,
  MetaTrx,
  PostTrx,
  RegistrationLogTrx,
  SeederTrx,
  SignupTrx,
  TermTrx,
  UserTrx,
  OptionsTrx,
  SiteTrx,
} from "../../transactions";
import { Constructor } from "../../types";
import { Components } from "../components";
import { Tables } from "../tables";
import { QueryUtil } from "./query.util";

@component({ scope: Scope.Transient })
export class TrxUtil {
  #props = new Map();

  constructor(private components: Components, private tables: Tables) {}

  usingBlog(blogId: number) {
    this.tables.index = blogId;
    for (const [, obj] of this.#props.entries()) {
      obj.tables.index = blogId;
    }
  }

  private get<T>(target: Constructor<T>): T {
    if (this.#props.has(target)) {
      return this.#props.get(target) as T;
    }
    const component: any = this.components.get(target as any);
    component.tables.index = this.tables.index;

    if (component?.queryUtil && component.queryUtil instanceof QueryUtil) {
      component.queryUtil.usingBlog(this.tables.index);
    }

    this.#props.set(target, component);
    return component as T;
  }

  get user() {
    return this.get(UserTrx);
  }

  get term() {
    return this.get(TermTrx);
  }

  get site() {
    return this.get(SiteTrx);
  }

  get signup() {
    return this.get(SignupTrx);
  }

  get seeder() {
    return this.get(SeederTrx);
  }

  get registrationLog() {
    return this.get(RegistrationLogTrx);
  }

  get post() {
    return this.get(PostTrx);
  }

  get options() {
    return this.get(OptionsTrx);
  }

  get meta() {
    return this.get(MetaTrx);
  }

  get link() {
    return this.get(LinkTrx);
  }

  get comment() {
    return this.get(CommentTrx);
  }

  get blog() {
    return this.get(BlogTrx);
  }
}
