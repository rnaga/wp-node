import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import Database from "@rnaga/wp-node/database";

test("update", async () => {
  const context = await Application.getContext("single");
  const database = context.components.get(Database);

  const current = context.components.get(Current);
  const trx = await database.transaction;

  const builder = trx
    .insert([
      {
        object_id: 1,
        term_taxonomy_id: 2,
        term_order: 3,
      },
      { object_id: 5, term_taxonomy_id: 4, term_order: 4 },
    ])
    .into(current.tables.get("term_relationships"))
    .onConflict("term_order")
    .merge(["term_order"]);

  await trx.rollback();
  console.log(builder.toString());
});
