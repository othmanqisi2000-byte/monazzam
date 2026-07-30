const WEEKDAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Returns today's weekday code (e.g. 'MON') based on the server's local time.
 */
function todayCode() {
  return WEEKDAY_CODES[new Date().getDay()];
}

/**
 * Returns today's date as "YYYY-MM-DD" in local time.
 */
function todayDateStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * If today is one of the task's recurring days, returns the fields needed to
 * (re)activate the task for today: a dueDate combining today's date with the
 * recurring time, and lastRecurredOn set to today's date string (used to
 * avoid re-triggering more than once per day). Returns null if today isn't
 * one of the configured recurring days.
 *
 * @param {string[]} recurringDays - Weekday codes, e.g. ['SUN', 'TUE']
 * @param {string|null} recurringTime - "HH:mm", defaults to "00:00"
 */
function resolveOccurrenceForToday(recurringDays, recurringTime) {
  if (!Array.isArray(recurringDays) || recurringDays.length === 0) return null;
  if (!recurringDays.includes(todayCode())) return null;

  const dateStr = todayDateStr();
  const timeStr = recurringTime || '00:00';
  const dueDate = new Date(`${dateStr}T${timeStr}:00`);

  return {
    dueDate,
    lastRecurredOn: dateStr,
  };
}

module.exports = { WEEKDAY_CODES, todayCode, todayDateStr, resolveOccurrenceForToday };
