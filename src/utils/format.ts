import dayjs from 'dayjs';

/**
 * Format a date string to a readable format.
 * @param dateStr - ISO 8601 date string
 * @param format - dayjs format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns Formatted date string
 */
export function formatDate(
  dateStr: string | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format(format);
}

/**
 * Format a number with thousands separators.
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a currency amount.
 * @param amount - The amount value
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) return '-';
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * Build a proxy URL from proxy details.
 * Format: protocol://username:password@host:port
 * @param proxy - Proxy object with connection details
 * @returns Proxy URL string
 */
export function formatProxyUrl(proxy: {
  protocol: string;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
}): string {
  const { protocol, host, port, username, password } = proxy;
  if (username && password) {
    return `${protocol}://${username}:${password}@${host}:${port}`;
  }
  return `${protocol}://${host}:${port}`;
}

/**
 * Format latency value with unit and color indicator.
 * @param latency - Latency in milliseconds
 * @returns Formatted latency string
 */
export function formatLatency(latency: number | null | undefined): string {
  if (latency === null || latency === undefined) return '-';
  if (latency < 1000) return `${latency}ms`;
  return `${(latency / 1000).toFixed(1)}s`;
}

/**
 * Format a percentage value.
 * @param value - Number between 0-1 or 0-100
 * @param isRatio - If true, value is 0-1 ratio; if false, value is 0-100
 * @returns Formatted percentage string
 */
export function formatPercent(value: number | null | undefined, isRatio: boolean = true): string {
  if (value === null || value === undefined) return '-';
  const percent = isRatio ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

/**
 * Format duration in milliseconds to a readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m${seconds}s`;
}

/**
 * Truncate a string with ellipsis if it exceeds max length.
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated string
 */
export function truncate(str: string | null | undefined, maxLength: number = 50): string {
  if (!str) return '-';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
