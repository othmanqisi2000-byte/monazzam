import React, { useEffect, useState } from 'react';
import { X, Mail, Repeat } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

const WEEKDAYS = [
  { code: 'SUN', label: 'Sun' },
  { code: 'MON', label: 'Mon' },
  { code: 'TUE', label: 'Tue' },
  { code: 'WED', label: 'Wed' },
  { code: 'THU', label: 'Thu' },
  { code: 'FRI', label: 'Fri' },
  { code: 'SAT', label: 'Sat' },
];

// Splits an ISO datetime string into separate "YYYY-MM-DD" and "HH:mm"
// strings for the native <input type="date"> / <input type="time"> fields.
function splitDueDate(isoString) {
  if (!isoString) return { date: '', time: '' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

// Combines separate date/time strings back into a single ISO datetime.
// If only a date is given, defaults the time to 00:00.
function combineDueDate(date, time) {
  if (!date) return null;
  const combined = new Date(`${date}T${time || '00:00'}:00`);
  if (isNaN(combined.getTime())) return null;
  return combined.toISOString();
}

/**
 * Modal used for both creating and editing a task.
 * If `task` is provided, the modal operates in edit mode.
 *
 * `globalReminderEmail` is set once by the user (see EmailSettingsModal) and
 * is applied automatically to every task that has a due date — there is no
 * per-task email field anymore.
 *
 * Recurring tasks pick a set of weekdays + a time of day instead of a single
 * date. The backend brings the task back to "To Do" automatically on each
 * chosen day.
 */
function TaskModal({ isOpen, task, defaultStatus, globalReminderEmail, onOpenEmailSettings, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [dueDateStr, setDueDateStr] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState([]);
  const [recurringTime, setRecurringTime] = useState('09:00');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(task);

  useEffect(() => {
    if (isOpen) {
      setTitle(task?.title || '');
      setDescription(task?.description || '');
      setStatus(task?.status || defaultStatus || 'TODO');
      const { date, time } = splitDueDate(task?.dueDate);
      setDueDateStr(date);
      setDueTimeStr(time);
      setIsRecurring(Boolean(task?.isRecurring));
      setRecurringDays(task?.recurringDays || []);
      setRecurringTime(task?.recurringTime || '09:00');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, task, defaultStatus]);

  if (!isOpen) return null;

  const toggleDay = (code) => {
    setRecurringDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  const validate = () => {
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = 'Title is required.';
    if (title.trim().length > 120) nextErrors.title = 'Title must be under 120 characters.';

    if (isRecurring) {
      if (recurringDays.length === 0) {
        nextErrors.recurringDays = 'Pick at least one day.';
      }
    } else if (dueTimeStr && !dueDateStr) {
      nextErrors.dueDate = 'Pick a date to go with that time.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const dueDate = isRecurring ? null : combineDueDate(dueDateStr, dueTimeStr);
    // A task has an active reminder schedule if it either has a one-off due
    // date, or is recurring (the backend computes each day's dueDate itself).
    const hasSchedule = Boolean(dueDate) || isRecurring;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        dueDate,
        reminderEmail: hasSchedule && globalReminderEmail ? globalReminderEmail : null,
        isRecurring,
        recurringDays: isRecurring ? recurringDays : [],
        recurringTime: isRecurring ? recurringTime : null,
      });
      onClose();
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEditMode ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {errors.form}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design landing page hero section"
              className={`w-full rounded-md border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                errors.title ? 'border-red-400' : 'border-slate-300'
              }`}
              autoFocus
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this task..."
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2">
            <label htmlFor="isRecurring" className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <Repeat size={15} className="text-indigo-500" />
              Repeat weekly
            </label>
            <button
              type="button"
              id="isRecurring"
              role="switch"
              aria-checked={isRecurring}
              onClick={() => setIsRecurring((prev) => !prev)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isRecurring ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isRecurring ? 'translate-x-4.5' : 'translate-x-1'
                }`}
                style={{ transform: isRecurring ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          {isRecurring ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Repeat on
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map((day) => {
                  const active = recurringDays.includes(day.code);
                  return (
                    <button
                      key={day.code}
                      type="button"
                      onClick={() => toggleDay(day.code)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {errors.recurringDays && (
                <p className="text-xs text-red-500 mt-1">{errors.recurringDays}</p>
              )}

              <div className="mt-3">
                <label htmlFor="recurringTime" className="block text-sm font-medium text-slate-700 mb-1">
                  Time
                </label>
                <input
                  id="recurringTime"
                  type="time"
                  value={recurringTime}
                  onChange={(e) => setRecurringTime(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-xs text-slate-400 mt-1">
                  On each selected day, this task moves back to "To Do" and is due at this time.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDateStr}
                  onChange={(e) => setDueDateStr(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    errors.dueDate ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
                {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
              </div>
              <div>
                <label htmlFor="dueTime" className="block text-sm font-medium text-slate-700 mb-1">
                  Time
                </label>
                <input
                  id="dueTime"
                  type="time"
                  value={dueTimeStr}
                  onChange={(e) => setDueTimeStr(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
          )}

          {(isRecurring || dueDateStr) && (
            <div className="flex items-start gap-2 text-xs bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
              <Mail size={14} className="text-indigo-500 mt-0.5 shrink-0" />
              {globalReminderEmail ? (
                <p className="text-indigo-700">
                  Reminders will be sent to <strong>{globalReminderEmail}</strong>.{' '}
                  <button
                    type="button"
                    onClick={onOpenEmailSettings}
                    className="underline hover:text-indigo-900"
                  >
                    Change
                  </button>
                </p>
              ) : (
                <p className="text-indigo-700">
                  No reminder email set yet.{' '}
                  <button
                    type="button"
                    onClick={onOpenEmailSettings}
                    className="underline hover:text-indigo-900"
                  >
                    Set one
                  </button>{' '}
                  to get notified before this task starts.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-md"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
