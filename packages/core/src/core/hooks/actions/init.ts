/* eslint-disable @typescript-eslint/no-unused-vars */
import { action, hook } from "../../../decorators/hooks";
import { Context } from "../../context";

@hook("core_filter_init")
export class Init {
  @action("core_init")
  init(context: Context) {}
}
