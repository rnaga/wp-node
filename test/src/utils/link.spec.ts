import Application from "@rnaga/wp-node/application";
import { LinkUtil } from "@rnaga/wp-node/core/utils/link.util";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";

test("setUrlScheme", async () => {
  const context = await Application.getContext("single");
  const linkUtil = context.components.get(LinkUtil);

  let url = "example.org/what/ever/";
  url = linkUtil.setUrlScheme(url, "https");
  // Result: 'example.org/what/ever/'
  expect(url).toBe("example.org/what/ever/");

  url = linkUtil.setUrlScheme(`http://${url}`, "https");
  // Result: 'https://example.org/what/ever ('https' if is_ssl() is true, otherwise 'http')
  expect(url).toBe("https://example.org/what/ever/");
});

test("getHomeUrl", async () => {
  // Single Site
  const contextSingle = await Application.getContext("single");
  let linkUtil = contextSingle.components.get(LinkUtil);

  let url = await linkUtil.getHomeUrl();
  expect(url).toBe("http://localhost:8081/");

  // Multi Site
  const contextMulti = await Application.getContext("multi");
  linkUtil = contextMulti.components.get(LinkUtil);

  url = await linkUtil.getHomeUrl({ path: "/" });
  expect(url).toBe("https://localhost/");

  url = await linkUtil.getHomeUrl({
    blogId: 2,
    path: "/a/b/c",
    scheme: "http",
  });
  expect(url).toBe("http://localhost/example/a/b/c");
});

test("getPermaLink", async () => {
  const context = await Application.getContext("single");
  const linkUtil = context.components.get(LinkUtil);
  const postUtil = context.components.get(PostUtil);
  const queryUtil = context.components.get(QueryUtil);

  const posts = await queryUtil.posts((query) => {
    query.where("post_type", "post").builder.limit(1);
  });

  const post = await postUtil.get((posts as any)[0].ID);
  let link = await linkUtil.getPermalink(post);

  expect(link).toBe(`http://localhost:8081/?p=${post.props?.ID}`);

  const attachments = await queryUtil.posts((query) => {
    query.where("post_type", "attachment").builder.limit(1);
  });

  const attachment = await postUtil.get((attachments as any)[0].ID);
  link = await linkUtil.getPermalink(attachment);
  expect(link).toBe(
    `http://localhost:8081/?attachment_id=${attachment.props?.ID}`
  );

  const pages = await queryUtil.posts((query) => {
    query.where("post_type", "page").builder.limit(1);
  });

  const page = await postUtil.get((pages as any)[0].ID);
  link = await linkUtil.getPermalink(page);
  expect(link).toBe(`http://localhost:8081/?page_id=${page.props?.ID}`);
});
