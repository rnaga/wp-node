import Application from "@rnaga/wp-node/application";
import { Term } from "@rnaga/wp-node/core/term";
import { TermTrx } from "@rnaga/wp-node/transactions/term.trx";

test("get a term", async () => {
  const context = await Application.getContext("single");

  const term = await context.components.asyncGet(Term, [1]);

  expect(term.props?.term_id).toBe(1);

  const term2 = context.components.get(Term, [
    1,
    term.props?.taxonomy,
    term.props,
  ]);
  expect(term2.props?.term_id).toBe(1);
});

test("children", async () => {
  const context = await Application.getContext("multi");
  const termTrx = context.components.get(TermTrx);

  const random = Math.floor(Math.random() * 10000);
  const term1 = await termTrx.insert(`test-term-child-${random}`, "category");
  const term2 = await termTrx.insert(
    `test-term-child-2-${random}`,
    "category",
    { parentId: term1.term_id }
  );

  const term = await context.components.asyncGet(Term, [term1.term_id]);
  const children = await term.children();
  expect(children?.[0].term_id).toBe(term2.term_id);
});
