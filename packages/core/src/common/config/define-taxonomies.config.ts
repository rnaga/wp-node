import type * as types from "../../types";
import { readJsonFiles } from "../files";

export const defineTaxonomies = (
  args: Partial<Record<string, types.ConfigTaxonomy>>
) => {
  let taxonomies = {} as types.TaxonomyRecord;

  for (const [name, settings] of Object.entries(args)) {
    taxonomies = {
      ...taxonomies,
      [name]: {
        hierarchical: settings?.hierarchical,
        objectType: settings?.objectType ?? name,
        _builtin: false,
        capabilities: settings?.capabilities ?? {},
        showUi: settings?.showUi ?? true,
      },
    };
  }

  return taxonomies;
};

export const defineTaxonomiesFromDirectory = (directory: string) => {
  const json =
    readJsonFiles<Record<types.TaxonomyName, types.ConfigTaxonomy>>(directory);
  return json ? defineTaxonomies(json) : undefined;
};
