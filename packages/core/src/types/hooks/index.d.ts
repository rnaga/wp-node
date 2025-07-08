export type * from "./actions";
export type * from "./filters";
export type * from "./command";

import { Hooks as HooksCore } from "../../core/hooks/hooks";
import { Filters } from "./filters";
import { Actions } from "./actions";

export type Hooks<TFilters = Filters, TActions = Actions> = InstanceType<
  typeof HooksCore<TFilters, TActions>
>;
