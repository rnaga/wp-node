import Application from "@rnaga/wp-node/application";
import { PostTrx } from "@rnaga/wp-node/transactions";
import { PostUtil } from "@rnaga/wp-node/core/utils/post.util";

// JSON strings with escaped quotes — the kind produced by pipe params like {"format":"YYYY-MM-DD"}.
// Without skipUnslashFields, formatting.unslash() strips all backslashes, corrupting the JSON.

test("post_content with JSON is preserved when skipUnslashFields includes post_content", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);
  const postTrx = context.components.get(PostTrx);
  await context.current.assumeUser(1);

  const json = JSON.stringify({ format: "YYYY-MM-DD", value: 'say "hello"' });

  const postId = await postTrx.upsert(
    {
      post_author: 1,
      post_title: "skipUnslash JSON test",
      post_type: "post",
      post_content: json,
    },
    { skipUnslashFields: ["post_content"] }
  );

  const post = await postUtil.get(postId);
  expect(post.props?.post_content).toBe(json);
  // Must round-trip as valid JSON
  expect(() => JSON.parse(post.props?.post_content ?? "")).not.toThrow();
});

test("post_content with nested JSON (Lexical-style) is preserved", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);
  const postTrx = context.components.get(PostTrx);
  await context.current.assumeUser(1);

  const lexicalState = JSON.stringify({
    root: {
      children: [{ type: "paragraph", text: 'value: "42"' }],
      params: { pipe: { format: "YYYY-MM-DD" } },
    },
  });

  const postId = await postTrx.upsert(
    {
      post_author: 1,
      post_title: "skipUnslash nested JSON test",
      post_type: "post",
      post_content: lexicalState,
    },
    { skipUnslashFields: ["post_content"] }
  );

  const post = await postUtil.get(postId);
  expect(post.props?.post_content).toBe(lexicalState);
  expect(() => JSON.parse(post.props?.post_content ?? "")).not.toThrow();
});

test("post_content with JSON is corrupted without skipUnslashFields (documents the existing bug)", async () => {
  const context = await Application.getContext("single");
  const postUtil = context.components.get(PostUtil);
  const postTrx = context.components.get(PostTrx);
  await context.current.assumeUser(1);

  const json = JSON.stringify({ format: "YYYY-MM-DD", value: 'say "hello"' });

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "no-skipUnslash regression test",
    post_type: "post",
    post_content: json,
  });

  const post = await postUtil.get(postId);
  // Backslashes are stripped by unslash, so the stored value differs from what was written.
  expect(post.props?.post_content).not.toBe(json);
});
