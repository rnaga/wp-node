import moment from "moment";

import { Scope } from "../constants";
import { component } from "../decorators/component";
import { Vars } from "./vars";

import type { MomentInput } from "moment";
import { Moment } from "moment-timezone";

@component({ scope: Scope.Transient })
export class DateTime {
  #gmtDate: Moment;
  static mySQLFormat = "YYYY-MM-DD HH:mm:ss";
  constructor(private vars: Vars, initialDate?: MomentInput) {
    this.#gmtDate = initialDate
      ? moment
          .utc(initialDate)
          .subtract(this.vars.TIME_OFFSET_MINUTES, "minutes")
      : moment.utc();
  }

  get currentLocalTime() {
    return moment
      .utc()
      .add(this.vars.TIME_OFFSET_MINUTES, "minutes")
      .toDate()
      .getTime();
  }

  get currentDate() {
    return new Date(this.currentLocalTime);
  }

  private get time() {
    const localDateTime = moment.utc(this.#gmtDate);
    return localDateTime.add(this.vars.TIME_OFFSET_MINUTES, "minutes");
  }

  format(v: string) {
    return this.time.format(v);
  }

  gmtFormat(v: string) {
    this.#gmtDate.format(v);
  }

  get mySQLDatetime() {
    return this.format(DateTime.mySQLFormat);
  }

  get mySQLGMTDatetime() {
    return this.#gmtDate.format(DateTime.mySQLFormat);
  }

  greaterThan(gmtDate: MomentInput) {
    return moment.utc(this.#gmtDate) > moment.utc(gmtDate);
  }

  isFuture() {
    return moment.utc(this.#gmtDate) > moment.utc();
  }
}
