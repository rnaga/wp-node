import type * as types from "../types";

type Item<
  T = "terms" | "posts" | "comments",
  Extended = any
> = T extends "terms"
  ? Pick<types.Tables["terms"], "term_id"> & { parent: number } & Extended // Partial<types.Tables["terms"]> &
  : // { term_id: number; parent: number } & Extended
  T extends "comments"
  ? Pick<types.Tables["comments"], "comment_ID" | "comment_parent"> &
      Partial<types.Tables["comments"]> &
      Extended
  : Pick<types.Tables["posts"], "ID" | "post_parent"> &
      //Partial<types.Tables["posts"]> &
      Extended;

type Hierarchy<T> = Array<
  T & {
    depth: number;
    children: Hierarchy<T>;
  }
>;

type Flat<T> = Array<T & { depth: number }>;

const to = <
  Extended,
  T extends "terms" | "posts" | "comments",
  I extends Item<T, Extended> = Item<T, Extended>
>(
  table: T,
  items: I[]
) => {
  const flat: Hierarchy<I> = items.map((item) => ({
    ...item,
    depth: 0,
    children: [],
  }));

  const hierarchy: Hierarchy<I> = [];

  outerLoop: for (const item of flat as any) {
    const parentId: number =
      table == "terms"
        ? item.parent
        : table == "comments"
        ? item.comment_parent
        : item.post_parent;
    if (0 >= parentId) {
      hierarchy.push(item);
      continue;
    }

    for (const parent of flat as any) {
      const parentItemId =
        table == "terms"
          ? parent.term_id
          : table == "comments"
          ? parent.comment_ID
          : parent.ID;
      if (parentId == parentItemId) {
        item.depth = parent.depth + 1;
        parent.children.push(item);
        continue outerLoop;
      }
    }

    // If no parent is found in the entire flat array, add the item to hierarchy
    hierarchy.push(item);
  }

  return hierarchy;
};

export const comments = <
  TComments extends Item<"comments", types.Tables["comments"]>
>(
  comments: TComments[]
) => {
  return to<TComments, "comments">("comments", comments);
};

export const posts = <TPosts extends Item<"posts", types.Tables["posts"]>>(
  posts: TPosts[]
) => {
  return to<TPosts, "posts">("posts", posts);
};

export const terms = <
  TTerms extends Item<"terms", Partial<types.Tables["terms"]>>
>(
  terms: TTerms[]
) => {
  return to<TTerms, "terms">("terms", terms);
};

export const flat = <T extends Parameters<typeof to>[1]>(
  table: Parameters<typeof to>[0],
  items: T
) => {
  const r: Flat<T[number]> = [];
  function innerFn(hierarchy: ReturnType<typeof to>) {
    for (const item of hierarchy) {
      r.push({ ...item, depth: item.depth });
      if (item.children) {
        innerFn(item.children);
      }
    }
  }

  innerFn(to(table, items));
  return r;
};

export const map = <T extends Parameters<typeof to>[1], R>(
  table: Parameters<typeof to>[0],
  items: T,
  cb: (item: Hierarchy<T[number]>[number], index: number) => R
) => {
  const r: R[] = [];
  let index = 0;

  function innerFn(hierarchy: ReturnType<typeof to>) {
    for (const item of hierarchy) {
      r.push(cb(item, index++));
      if (item.children) {
        innerFn(item.children);
      }
    }
  }

  innerFn(to(table, items));
  return r;
};
