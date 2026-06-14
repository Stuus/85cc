/**
 * Date formatting utilities to ensure consistent formats across the application.
 */

// e.g. "6/15" for ReportPage manual input default
export function getCurrentMonthDayForDisplay(): string {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// e.g. "06-15" for backup filename
export function getCurrentMonthDayForFilename(): string {
  const d = new Date();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${m}-${day}`;
}

// e.g. "06" for filtering current month's backups
export function getCurrentMonthForFilename(): string {
  const d = new Date();
  return (d.getMonth() + 1).toString().padStart(2, '0');
}
