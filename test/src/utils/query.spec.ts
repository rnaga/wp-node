import { z } from "zod";

import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { PostsQuery } from "@rnaga/wp-node/query-builder";
import * as val from "@rnaga/wp-node/validators";

test("terms", async () => {
  const context = await Application.getContext("single");

  const util = context.components.get(QueryUtil);

  const result = await util.terms((query) => {
    query.where("taxonomy", "category").where("name", "Uncategorized");
  });

  expect(result && result[0].name).toBe("Uncategorized");
});

test("posts", async () => {
  const context = await Application.getContext("single");

  const util = context.components.get(QueryUtil);
  const posts = await util.posts((query) => {
    query.from.where("ID", 1).builder.limit(1);
  });

  expect((posts as any)[0].ID).toBe(1);
});

test("comments", async () => {
  const context = await Application.getContext("single");

  const util = context.components.get(QueryUtil);
  const comments = await util.comments((query) => {
    query.from.where("ID", 1).builder.limit(1);
  });

  expect(comments && comments[0].comment_ID).toBe(1);
});

test("users", async () => {
  const context = await Application.getContext("single");

  const util = context.components.get(QueryUtil);
  const users = await util.users((query) => {
    query.from.where("ID", 1).builder.limit(1);
  });

  console.log(users);
  expect(users && users[0].ID).toBe(1);
});

test("meta", async () => {
  const context = await Application.getContext("single");

  const util = context.components.get(QueryUtil);
  const meta = await util.meta("post", (query) => {
    query.withIds([2]);
  });
  expect(meta && meta.length > 0).toBe(true);
});

test("blogs", async () => {
  const context = await Application.getContext("multi");

  const util = context.components.get(QueryUtil);
  const blogs = await util.blogs((query) => {
    query.where("blog_id", 1);
  });

  expect(blogs && blogs.length > 0).toBe(true);

  const blogGet = await util.blogs((query) => {
    query.get(1);
  }, val.database.wpBlogs);

  expect(blogGet && blogGet.blog_id == 1).toBe(true);
});

test("sites", async () => {
  const context = await Application.getContext("multi");

  const util = context.components.get(QueryUtil);
  const sites = await util.sites((query) => {
    query.where("id", 1);
  });

  expect(sites && sites.length > 0).toBe(true);

  const siteGet = await util.sites((query) => {
    query.get(1);
  }, val.database.wpSite);

  expect(siteGet && siteGet.id == 1).toBe(true);
});

test("options", async () => {
  const context = await Application.getContext("multi");

  const util = context.components.get(QueryUtil);
  const options = await util.options((query) => {
    query.get("home");
  });

  expect(options?.option_name).toBe("home");

  const util2 = context.components.get(QueryUtil);
  const options2 = await util2.usingBlog(2).options((query) => {
    query.get("home");
  });
  console.log(options2);
});

test("custom", async () => {
  const context = await Application.getContext("multi");

  const util = context.components.get(QueryUtil);
  const posts = await util.custom(
    PostsQuery,
    z.array(val.database.wpPosts),
    (query) => {
      query.where("ID", 1).builder.limit(1);
    }
  );

  console.log(posts);
});

test("common", async () => {
  const context = await Application.getContext("multi");

  const util = context.components.get(QueryUtil);
  const links = await util.common("links", (query) => {
    query.where("link_name", "link");
  });

  console.log(links);

  const signups = await util.common("signups", (query) => {
    query.where("domain", "localhost");
    console.log(query.builder.toString());
  });

  console.log(signups);
});
