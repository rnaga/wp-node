import { component } from "../../decorators/component";
import { RevisionTrx } from "../../transactions";
import { Components } from "../components";
import { BlogUtil } from "./blog.util";
import { CommentUtil } from "./comment.util";
import { CrudUtil } from "./crud.util";
import { DateTimeUtil } from "./date-time.util";
import { LinkUtil } from "./link.util";
import { MetaUtil } from "./meta.util";
import { PostUtil } from "./post.util";
import { QueryUtil } from "./query.util";
import { RolesUtil } from "./roles.util";
import { SiteUtil } from "./site.util";
import { TaxonomyUtil } from "./taxonomy.util";
import { TermUtil } from "./term.util";
import { TrxUtil } from "./trx.util";
import { UserUtil } from "./user.util";

@component()
export class Utils {
  constructor(private components: Components) {}

  get blog() {
    return this.components.get(BlogUtil);
  }

  get comment() {
    return this.components.get(CommentUtil);
  }

  get datetime() {
    return this.components.get(DateTimeUtil);
  }

  get meta() {
    return this.components.get(MetaUtil);
  }

  get post() {
    return this.components.get(PostUtil);
  }

  get revision() {
    return this.components.get(RevisionTrx);
  }

  get roles() {
    return this.components.get(RolesUtil);
  }

  get taxonomy() {
    return this.components.get(TaxonomyUtil);
  }

  get user() {
    return this.components.get(UserUtil);
  }

  get trx() {
    return this.components.get(TrxUtil);
  }

  get query() {
    return this.components.get(QueryUtil);
  }

  get link() {
    return this.components.get(LinkUtil);
  }

  get site() {
    return this.components.get(SiteUtil);
  }

  get term() {
    return this.components.get(TermUtil);
  }

  get crud() {
    return this.components.get(CrudUtil);
  }
}
