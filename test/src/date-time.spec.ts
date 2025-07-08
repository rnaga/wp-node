import moment from "moment-timezone";
import Application from "@rnaga/wp-node/application";
import { Current } from "@rnaga/wp-node/core/current";
import { DateTimeUtil } from "@rnaga/wp-node/core/utils/date-time.util";
import { OptionsTrx } from "@rnaga/wp-node/transactions";

test("date time", async () => {
  const context = await Application.getContext("multi");
  const optionsTrx = context.components.get(OptionsTrx);
  const current = context.components.get(Current);

  await optionsTrx.update("timezone_string", "America/New_York");
  await current.setTimezone();

  const dateTimeUtil = context.components.get(DateTimeUtil);

  const postDate = dateTimeUtil.get().mySQLDatetime;
  const postGmtDate = dateTimeUtil.get().mySQLGMTDatetime;

  console.log(postDate, postGmtDate);

  console.log(moment.utc("2024-05-04 13:00:41").format());

  const offsetHour = Math.floor(
    (new Date().getTime() - dateTimeUtil.get().currentLocalTime) /
      (60 * 60 * 1000 - 10)
  );

  console.log(offsetHour);
  expect(offsetHour == 4 || offsetHour == 5).toBe(true);

  const localMySQLDatetime = dateTimeUtil.get().mySQLDatetime;
  const date = new Date(localMySQLDatetime);

  const gmtMySQLDatetime = dateTimeUtil.get(date).mySQLGMTDatetime;
  console.log(localMySQLDatetime, gmtMySQLDatetime);

  await optionsTrx.update("timezone_string", "Etc/GMT");
});
