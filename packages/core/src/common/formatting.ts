import { phpUnserialize } from "./php-serialize";
import { formatDate, formatDateMySQL } from "./date";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace formatting {
  export const date = formatDate;
  export const dateMySQL = formatDateMySQL;

  /**
   * Parse a full name into first and last names.
   *
   * @param fullName - The full name to parse
   * @returns An object containing the first and last names
   */
  export const parseName = (fullName: string) => {
    // Trim the input and check if it is empty
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      // Return default values if the input is empty or only spaces
      return { firstName: "", lastName: "" };
    }

    const names = trimmedName.split(/\s+/); // Split the string by whitespace
    if (names.length === 1) {
      // If there's only one name part, consider it as the first name
      return { firstName: names[0], lastName: "" };
    }
    // Take the first part as the first name, and join the rest as the last name
    const firstName = names.shift() as string; // Remove and get the first element
    const lastName = names.join(" "); // Join the remaining elements to form the last name
    return { firstName, lastName };
  };

  export const trimMarkupComments = (rawMarkup: string): string => {
    // Regular expression to match HTML comments
    const commentPattern = /<!--[\s\S]*?-->/g;
    // Replace HTML comments with an empty string
    const trimmedMarkup = rawMarkup.replace(commentPattern, "");
    return trimmedMarkup;
  };

  // wp_specialchars_decode
  export const specialcharsDecode = (
    text: string,
    quoteStyle: number | string = 2
  ): string => {
    text = text.toString();

    if (text.length === 0) {
      return "";
    }

    // Don't bother if there are no entities - saves a lot of processing.
    if (!text.includes("&")) {
      return text;
    }

    // Match the previous behavior of _wp_specialchars() when the quoteStyle is not an accepted value.
    if (!quoteStyle) {
      quoteStyle = 2;
    } else if (![0, 2, 3, "single", "double"].includes(quoteStyle)) {
      quoteStyle = 3;
    }

    // More complete than get_html_translation_table( HTML_SPECIALCHARS ).
    const single: Record<string, string> = {
      "&#039;": "'",
      "&#x27;": "'",
    };
    const double: Record<string, string> = {
      "&quot;": '"',
      "&#034;": '"',
      "&#x22;": '"',
    };
    const others: Record<string, string> = {
      "&lt;": "<",
      "&#060;": "<",
      "&gt;": ">",
      "&#062;": ">",
      "&amp;": "&",
      "&#038;": "&",
      "&#x26;": "&",
      "&apos;": "'",
      "&#039;": "'",
    };

    // Define a regular expression to match HTML entities
    const entityRegex = /&(#[0-9]+|#x[0-9a-fA-F]+|[A-Za-z]+);/g;

    // Replace characters according to translation table.
    return text.replace(entityRegex, (match) => {
      return others[match] || double[match] || single[match] || match;
    });
  };

  export const slash = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(formatting.slash);
    }

    if (typeof value === "string") {
      return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }

    return value;
  };

  export const mapDeep = <V = any>(
    value: V,
    callback: (value: any) => any
  ): V => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        value[index] = mapDeep(value[index], callback);
      }
    } else if (typeof value === "object" && value !== null) {
      const objectKeys = Object.keys(value);
      for (const propertyName of objectKeys) {
        (value as any)[propertyName] = mapDeep(
          (value as any)[propertyName],
          callback
        );
      }
    } else {
      value = callback(value);
    }

    return value;
  };

  export const stripslashesDeep = <V = any>(value: V): V => {
    return mapDeep(value, stripslashesFromStringsOnly);
  };

  export const stripslashesFromStringsOnly = <V = any>(value: V): V => {
    if (typeof value === "string") {
      return value.replace(/\\/g, "") as V;
    }
    return value;
  };

  export const unslash = <V = any>(value: V): V => stripslashesDeep(value);

  /*
  export const unslash = <V = any>(v: V): V => {
    if (typeof v === "string") {
      return v.replace(/\\/g, "") as V;
    }
    return v;
  };
*/
  export const untrailingslashit = (value: string): string => {
    return value.replace(/[/\\]+$/, "");
  };

  export const removeAccents = (input: string): string => {
    return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  export const slug = (v: string) => {
    return unslash(
      removeAccents(v.replace(/[\r\n\t]+/g, " ").trim())
        .replace(/\s+/g, "-")
        .toLowerCase()
    );
  };

  export const key = (key: string | number): string => {
    if (typeof key === "string" || typeof key === "number") {
      key = String(key).toLowerCase();
      key = key.replace(/[^a-z0-9_-]/g, "");
    }
    return key;
  };

  export const username = (username: string, strict = false) =>
    username
      .replace(/<[^>]*>/g, "") // Strip all HTML tags
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/%[a-fA-F0-9]{2}/g, "") // Remove percent-encoded characters
      .replace(/&\S+?;/g, "") // Remove HTML entities
      .replace(strict ? /[^a-z0-9 _.\-@]/gi : "", "") // If strict, reduce to ASCII for max portability
      .trim() // Trim leading and trailing whitespace
      .replace(/\s+/g, " "); // Consolidate contiguous whitespace

  export const stripTags = (value: string) => {
    return value.replace(/<[^>]*>/g, ""); // Strip all HTML tags
  };

  export const normalizeWhitespace = (str: string): string => {
    // Remove leading and trailing whitespace, then replace carriage returns with newlines
    return (
      str
        .trim()
        .replace(/\r/g, "\n")
        // Replace multiple consecutive newlines with a single newline
        .replace(/\n+/g, "\n")
        // Replace multiple consecutive spaces or tabs with a single space
        .replace(/[ \t]+/g, " ")
    );
  };

  export const primitive = (
    value: any
  ):
    | string
    | number
    | boolean
    | object
    | null
    | bigint
    | symbol
    // eslint-disable-next-line @typescript-eslint/ban-types
    | Function
    | undefined => {
    if (
      [
        "undefined",
        "boolean",
        "number",
        "bigint",
        "symbol",
        "function",
      ].includes(typeof value)
    ) {
      return value;
    }

    if (typeof value === "object") {
      return Object.assign({}, value);
    }

    if (typeof value !== "string") {
      value = new String(value).toString();
    }
    if (value === "true" || value === "false") {
      return value === "true";
    }

    try {
      if (value.match(/^[0-9]+[.0-9]*$/)) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          return numValue;
        }
      }
    } catch (e) {
      /* empty */
    }

    if (value === "null") {
      return null;
    }

    if (value === "undefined") {
      return undefined;
    }

    try {
      const parsedObject = JSON.parse(value);
      if (typeof parsedObject === "object") {
        return parsedObject;
      }
    } catch (e) {
      /* empty */
    }

    return phpUnserialize(value);
  };
}
