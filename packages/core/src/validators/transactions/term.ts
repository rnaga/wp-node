import * as database from "../database";

export const termUpdate = database.wpTerms
  .merge(database.wpTermTaxonomy)
  .omit({ count: true });

export const termInsert = termUpdate.omit({
  term_id: true,
  term_taxonomy_id: true,
});
