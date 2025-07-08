import Application from "@rnaga/wp-node/application";
import { CommonQuery, QueryBuilders } from "@rnaga/wp-node/query-builder";

test("registration_log", async () => {
  const context = await Application.getContext("multi");

  const builders = context.components.get(QueryBuilders);
  const builder = builders.queryBuilder;

  const registrationLog = builders.get(
    CommonQuery<"registration_log">,
    builder
  );

  registrationLog.withTable("registration_log").from.where("ID", 1);

  console.log(builder.toString());
});
