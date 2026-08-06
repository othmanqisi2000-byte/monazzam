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

function splitDueDate(isoString) {
  if (!isoString) return { date: '', time: '' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

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
 * `globalReminderEmail` is the optional reminder override set once by the
 * user. If it is empty, reminders fall back to the account email used for
 * signup or login.
 */
function TaskModal({
  isOpen,
  task,
  defaultStatus,
  globalReminderEmail,
  onOpenEmailSettings,
  onClose,
  onSubmit,
}) {
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEditMode ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {errors.form}
            </div>
          )}

          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
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
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about this task..."
              rows={3}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">
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

          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
            <label
              htmlFor="isRecurring"
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"
            >
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
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  isRecurring ? 'translate-x-4.5' : 'translate-x-1'
                }`}
                style={{ transform: isRecurring ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          {isRecurring ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Repeat on</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = recurringDays.includes(day.code);
                  return (
                    <button
                      key={day.code}
                      type="button"
                      onClick={() => toggleDay(day.code)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {errors.recurringDays && (
                <p className="mt-1 text-xs text-red-500">{errors.recurringDays}</p>
              )}

              <div className="mt-3">
                <label
                  htmlFor="recurringTime"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Time
                </label>
                <input
                  id="recurringTime"
                  type="time"
                  value={recurringTime}
                  onChange={(e) => setRecurringTime(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="mt-1 text-xs text-slate-400">
                  On each selected day, this task moves back to "To Do" and is due at this time.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-slate-700">
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
                {errors.dueDate && <p className="mt-1 text-xs text-red-500">{errors.dueDate}</p>}
              </div>
              <div>
                <label htmlFor="dueTime" className="mb-1 block text-sm font-medium text-slate-700">
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
            <div className="flex items-start gap-2 rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs">
              <Mail size={14} className="mt-0.5 shrink-0 text-indigo-500" />
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
                  No custom reminder email set. Reminders will go to your account email unless you{' '}
                  <button
                    type="button"
                    onClick={onOpenEmailSettings}
                    className="underline hover:text-indigo-900"
                  >
                    set another one
                  </button>
                  .
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
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
