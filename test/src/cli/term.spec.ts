import { Clis } from "@rnaga/wp-node-cli/clis";
import * as helpers from "../../helpers";

test("term get", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const result = await Clis.executeCommand([
    "",
    "",
    "term",
    "get",
    "category",
    "-i",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(result.props.term_id).toBe(1);
});

test("term list", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));
  const result = await Clis.executeCommand([
    "",
    "",
    "term",
    "list",
    "category",
    "-P",
    "5",
    "--configJson",
    configJson,
  ]);

  expect(result.data.length).toBeGreaterThan(0);
});

test("term create, update and delete", async () => {
  const configJson = JSON.stringify(helpers.getCliConfig("multi"));

  const random = Math.floor(Math.random() * 100000);
  const term = `test_term_${random}`;

  // Create a term
  let result = await Clis.executeCommand([
    "",
    "",
    "term",
    "create",
    "category",
    term,
    "-p",
    "1",
    "--configJson",
    configJson,
  ]);

  expect(result.data).not.toBeUndefined();
  const termId = result.data.term_id;

  // Update the term
  result = await Clis.executeCommand([
    "",
    "",
    "term",
    "update",
    "category",
    termId,
    "-n",
    `${term} - updated`,
    "--configJson",
    configJson,
  ]);

  expect(result.data).toBe(true);

  // Delete the term
  result = await Clis.executeCommand([
    "",
    "",
    "term",
    "delete",
    "category",
    termId,
    "--configJson",
    configJson,
  ]);

  expect(result.data).toBe(true);
});
