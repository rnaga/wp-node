import moment from "moment";
import {
  convertYearToString,
  formatDate,
  formatDateMySQL,
} from "@rnaga/wp-node/common/date";

test("year to string", () => {
  const result = convertYearToString(3025);
  expect(result).toBe("thirtytwentyfive");
});

test("formatDate", () => {
  const dateLocal = formatDate("2000-01-01 06:00:00", {
    format: "YYYY/MM/DD HH:mm:ss",
    offsetMinutes: -240,
  });
  expect(dateLocal).toBe("2000/01/01 02:00:00");

  const dateGMT = formatDate("2000-01-01 06:00:00");
  expect(dateGMT).toBe("01/01/2000 06:00am");

  const dateLocalFormatted = formatDate({
    format: "YYYY/MM/DD HH:mm:ss",
  });
  expect(
    /[0-9]{4}\/[0-9]{2}\/[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      dateLocalFormatted
    )
  ).toBe(true);
});

test("formatDateMySQL", () => {
  const date = formatDateMySQL("2000-01-01 06:00:00", {
    offsetMinutes: -240,
  });
  expect(date).toBe("2000-01-01 02:00:00");
});

test("offset", () => {
  const date = moment
    .utc("2024-06-10 20:02:00")
    .subtract(-420, "minutes")
    .format("YYYY-MM-DD HH:mm:ss");

  console.log(date);
});
