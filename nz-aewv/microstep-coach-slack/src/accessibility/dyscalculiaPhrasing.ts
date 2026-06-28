const ONES = [
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
  "nineteen"
] as const;

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety"
] as const;

const toNumberWords = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) {
    return `${value}`;
  }

  if (value < 20) {
    return ONES[value] ?? `${value}`;
  }

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const remainder = value % 10;
    const prefix = TENS[tens] ?? `${value}`;
    return remainder === 0 ? prefix : `${prefix}-${ONES[remainder]}`;
  }

  return `${value}`;
};

const toCountWords = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return `${value}`;
  }

  return toNumberWords(value);
};

export const formatDurationForDisplay = (
  minutes: number,
  dyscalculiaFriendlyPhrasing = false
): string => {
  if (!dyscalculiaFriendlyPhrasing) {
    return `${minutes} min`;
  }

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return `${minutes} minutes`;
  }

  if (minutes <= 15) {
    return `one ${toNumberWords(minutes)}-minute block`;
  }

  if (minutes % 15 === 0) {
    const blocks = minutes / 15;
    return `${toCountWords(blocks)} ${
      blocks === 1 ? "block" : "blocks"
    } of fifteen minutes`;
  }

  if (minutes % 10 === 0) {
    const blocks = minutes / 10;
    return `${toCountWords(blocks)} ${
      blocks === 1 ? "block" : "blocks"
    } of ten minutes`;
  }

  return `${toCountWords(minutes)} minutes`;
};

const rewriteDurationExpressions = (text: string): string =>
  text
    .replace(/\b(\d+)\s*(hours?|hrs?|hr)\b/gi, (_match, rawHours) => {
      const hours = Number.parseInt(rawHours, 10);
      if (!Number.isFinite(hours)) {
        return _match;
      }
      return formatDurationForDisplay(hours * 60, true);
    })
    .replace(/\b(\d+)\s*(minutes?|mins?|min|m)\b/gi, (_match, rawMinutes) => {
      const minutes = Number.parseInt(rawMinutes, 10);
      if (!Number.isFinite(minutes)) {
        return _match;
      }
      return formatDurationForDisplay(minutes, true);
    });

const rewriteSmallCounts = (text: string): string =>
  text.replace(/\b([1-9]|1\d|20)\b/g, (rawValue) => {
    const value = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(value)) {
      return rawValue;
    }
    return toNumberWords(value);
  });

export const formatTextForDyscalculiaSupport = (
  text: string,
  dyscalculiaFriendlyPhrasing = false
): string => {
  if (!dyscalculiaFriendlyPhrasing) {
    return text;
  }

  return rewriteSmallCounts(rewriteDurationExpressions(text));
};
