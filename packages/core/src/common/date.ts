import moment, { MomentInput } from "moment-timezone";
type DateArgsOptions = {
  format?: string;
} & (
  | {
      offsetMinutes?: number;
      withGMTOffset?: never;
    }
  | {
      offsetMinutes?: never;
      withGMTOffset?: boolean;
    }
);

type MySQLDateArgsOptions = Exclude<DateArgsOptions, "format">;

type DateArgs =
  | []
  | [MomentInput]
  | [MomentInput, DateArgsOptions]
  | [DateArgsOptions];

type MySQLDateArgs =
  | []
  | [MomentInput]
  | [MomentInput, MySQLDateArgsOptions]
  | [MySQLDateArgsOptions];

const parseDateArgs = <
  T extends DateArgs | MySQLDateArgs,
  TOptions extends T extends DateArgs ? DateArgsOptions : MySQLDateArgsOptions
>(
  ...args: T
) => {
  if (0 >= args.length) {
    return { date: undefined, options: undefined };
  }
  const [date, options]: [MomentInput, TOptions | undefined] =
    typeof args[0] === "object" &&
    !(args[0] instanceof Date) &&
    !(args[0] instanceof moment)
      ? [undefined, args[0] as TOptions]
      : args.length > 1
      ? [args[0] as MomentInput, args[1] as TOptions]
      : [args[0] as MomentInput, undefined];

  return { date, options };
};

export const formatDate = (...args: DateArgs): string => {
  // Parse the date and options from the provided arguments
  const { date, options } = parseDateArgs(...args);

  // Set default values for the format, offsetMinutes, and withGMTOffset if not provided
  const {
    format = "MM/DD/YYYY hh:mma", // Default format is "MM/DD/YYYY hh:mma"
    offsetMinutes = 0, // No offset by default
    withGMTOffset = false, // Do not include GMT offset by default
  } = options ?? {};

  // Initialize a moment object in UTC with the provided date
  const dateMoment = moment.utc(date);

  // If the output should include the GMT offset and the provided date is a Date object,
  // adjust for the local timezone. This adjustment is necessary because JavaScript Date objects,
  // regardless of the local timezone in which they are created, are internally converted to GMT.
  if (withGMTOffset && date instanceof Date) {
    // Subtract the local timezone offset to convert to local time
    dateMoment.subtract(new Date().getTimezoneOffset(), "minutes");
  }

  // If an offset in minutes is provided, apply it to the date
  if (typeof offsetMinutes === "number") {
    dateMoment.add(offsetMinutes, "minutes");
  }

  // Format and return the date as a string according to the specified format
  return dateMoment.format(format);
};

export function formatDateMySQL(...args: MySQLDateArgs): string {
  const { date, options } = parseDateArgs(...args);

  return formatDate(date, {
    ...options,
    format: "YYYY-MM-DD HH:mm:ss",
  });
}

// time()
export function currentUnixTimestamp(): number {
  return Math.floor(new Date().getTime() / 1000);
}

export function convertYearToString(n?: number): string {
  const year = n ?? new Date().getFullYear();

  const numberToWords = (n: number): string => {
    const belowTwenty = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
      "thirteen",
      "fourteen",
      "fifteen",
      "sixteen",
      "seventeen",
      "eighteen",
      "nineteen",
    ];
    const tens = [
      "",
      "",
      "twenty",
      "thirty",
      "forty",
      "fifty",
      "sixty",
      "seventy",
      "eighty",
      "ninety",
    ];

    if (n < 20) {
      return belowTwenty[n];
    } else if (n < 100) {
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? belowTwenty[n % 10] : "")
      );
    } else if (n < 1000) {
      return (
        belowTwenty[Math.floor(n / 100)] +
        "hundred" +
        (n % 100 !== 0 ? numberToWords(n % 100) : "")
      );
    } else if (n < 10000) {
      const firstTwoDigits = Math.floor(n / 100);
      const lastTwoDigits = n % 100;
      return numberToWords(firstTwoDigits) + numberToWords(lastTwoDigits);
    }

    return "twentytwentyfour";
  };

  return numberToWords(year).replace(/\s+/g, "");
}
