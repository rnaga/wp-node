import Application from "@rnaga/wp-node/application";
import { MetaCrud } from "@rnaga/wp-node/crud/meta.crud";
import { PostTrx } from "@rnaga/wp-node/transactions";

test("get", async () => {
  const context = await Application.getContext("single");

  const metaCrud = context.components.get(MetaCrud);

  const metas = await metaCrud.get("post", 360);

  expect(typeof metas.data).toBe("object");
});

test("get with keys", async () => {
  const context = await Application.getContext("single");
  const postTrx = context.components.get(PostTrx);

  const postId = await postTrx.upsert({
    post_author: 1,
    post_title: "__test_meta_get__",
    meta_input: {
      meta: "value",
    },
  });

  const metaCrud = context.components.get(MetaCrud);

  const metas = await metaCrud.get("post", postId, ["meta"]);

  expect(metas.data["meta"]).toBe("value");
});
