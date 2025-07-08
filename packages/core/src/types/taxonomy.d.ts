import { taxonomyNames, taxonomyObjectTypes } from "../defaults";

export interface TaxonomyNameExtend {}

export type TaxonomyName =
  | (typeof taxonomyNames)[number]
  | keyof TaxonomyNameExtend;

export interface TaxonomyObjectTypeExtend {}

export type TaxonomyObjectType =
  | (typeof taxonomyObjectTypes)[number]
  | keyof TaxonomyObjectTypeExtend;

export type TaxonomyCapability =
  | "manage_terms"
  | "edit_terms"
  | "delete_terms"
  | "assign_terms";

export type TaxonomyObject = {
  hierarchical: boolean;
  objectType: string;
  _builtin: boolean;
  capabilities?: Record<TaxonomyCapability, string>;
  showUi: boolean;
};

export type TaxonomyRecord = Record<TaxonomyName, TaxonomyObject>;
