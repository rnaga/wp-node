import { component } from "../../decorators/component";
import { Components } from "../components";
import { DateTime } from "../date-time";
import type { MomentInput } from "moment";

@component()
export class DateTimeUtil {
  constructor(private components: Components) {}

  get(date?: MomentInput) {
    return this.components.get(DateTime, [date]);
  }
}
