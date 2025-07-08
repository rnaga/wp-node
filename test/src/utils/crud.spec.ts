import Application from "@rnaga/wp-node/application";
import { CrudUtil } from "@rnaga/wp-node/core/utils/crud.util";

test("post", async () => {
  const context = await Application.getContext("multi");

  const crudUtil = context.components.get(CrudUtil);
  context.current.assumeUser(1);

  const result = await crudUtil.post.get(1);

  console.log(result);
});
