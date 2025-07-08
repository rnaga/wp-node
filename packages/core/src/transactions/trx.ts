import { Components } from "../core/components";
import { Current } from "../core/current";
import { Tables } from "../core/tables";

export abstract class Trx {
  tables: Tables;
  #components: Components;
  constructor(components: Components) {
    this.#components = components;
    const current = this.#components.get(Current);
    this.tables = current.tables;
  }

  usingBlog(blogId: number) {
    this.tables = this.#components.get(Tables);
    this.tables.index = blogId;
    return this;
  }
}
