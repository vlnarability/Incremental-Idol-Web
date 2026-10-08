/**
 * Idol Idle — Number Formatting
 *
 * Compact (K/M/B/T/Q) notation with 3 significant figures total (leading digit
 * + 2 more). Values < 1000 render as integers. Trailing zeros after the decimal
 * point are stripped.
 *
 * Examples:
 *   formatNumber(0)         → "0"
 *   formatNumber(999)       → "999"
 *   formatNumber(1234)      → "1.23K"
 *   formatNumber(12345)      → "12.3K"
 *   formatNumber(123456)     → "123K"
 *   formatNumber(1234567)    → "1.23M"
 *   formatNumber(1500)      → "1.5K"
 */

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Q'] as const;

/**
 * Format a (possibly fractional, possibly negative) number into compact
 * notation. Values < 1000 are floor-rounded to integers.
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n < 0) return '-' + formatNumber(-n);

  if (n < 1000) {
    return Math.floor(n).toString();
  }

  // tier = how many groups of 3 zeros above 10^3
  let tier = Math.min(
    Math.floor(Math.log10(n) / 3),
    SUFFIXES.length - 1,
  );
  let scaled = n / Math.pow(10, tier * 3);
  // If the rounded display value would round up to 1000 (e.g. 999,999),
  // bump up a tier so we show "1M" instead of "1000K".
  if (scaled >= 999.5 && tier < SUFFIXES.length - 1) {
    tier += 1;
    scaled = n / Math.pow(10, tier * 3);
  }
  return `${formatScaled(scaled)}${SUFFIXES[tier]}`;
}

/** Like formatNumber, but with a "/s" suffix for production-rate displays. */
export function formatRate(n: number): string {
  return `${formatNumber(n)}/s`;
}

/**
 * Format a millisecond duration into a compact "2h 13m" / "45s" / "1d 4h" string.
 * Always shows the two most-significant non-zero units.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Format a number in [1, 1000) with 3 significant figures total, stripping
 * trailing zeros after the decimal point.
 */
function formatScaled(scaled: number): string {
  let str: string;
  if (scaled >= 100) {
    // 1XX → 0 decimal places (e.g. 123)
    str = scaled.toFixed(0);
  } else if (scaled >= 10) {
    // 1X.X → 1 decimal place (e.g. 12.3)
    str = scaled.toFixed(1);
  } else {
    // 1.XX → 2 decimal places (e.g. 1.23)
    str = scaled.toFixed(2);
  }
  // Strip trailing zeros and a dangling decimal point.
  if (str.includes('.')) {
    str = str.replace(/0+$/, '').replace(/\.$/, '');
  }
  return str;
}
