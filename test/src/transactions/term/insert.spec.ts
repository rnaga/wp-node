import Application from "@rnaga/wp-node/application";
import { QueryUtil } from "@rnaga/wp-node/core/utils/query.util";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";

test("insert", async () => {
  const context = await Application.getContext("single");
  const termTrx = context.components.get(TermTrx);
  const queryUtil = context.components.get(QueryUtil);
  const taxonomyName = "category";

  // exceptions
  const exceptions: boolean[] = [];
  try {
    exceptions.push(false);
    await termTrx.insert("uncategorized", taxonomyName);
  } catch (e) {
    // Error: A term with the name provided already exists in this taxonomy
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  try {
    exceptions.push(false);
    await termTrx.insert("test-term", "__invalid__" as any);
  } catch (e) {
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  try {
    exceptions.push(false);
    await termTrx.insert("\\", taxonomyName);
  } catch (e) {
    // Error: A name is required for this term.
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  try {
    exceptions.push(false);
    await termTrx.insert("test-term", taxonomyName, {
      parentId: 99999999999,
    });
  } catch (e) {
    // Error: Invalid Parent Term
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  try {
    // Non-hierarchical
    exceptions.push(false);
    await termTrx.insert("__non-hierarchical__", "post_tag", {
      parentId: 5,
    });
  } catch (e) {
    // Error: Invalid Parent Term
    console.log(e);
    exceptions[exceptions.length] = true;
  }

  const newTerm = `__test_new_term ${Math.floor(Math.random() * 10000)}`;

  const result = await termTrx.insert(newTerm, "category", {
    description: "Description",
    parentId: 5,
    slug: newTerm,
  });

  expect(result.term_id > 0).toBe(true);

  const terms = await queryUtil.terms((query) => {
    query.where("name", newTerm).where("taxonomy", taxonomyName);
  });

  expect(terms && terms[0].name == newTerm).toBe(true);
  expect(exceptions.length).toEqual(exceptions.filter(() => true).length);
});
