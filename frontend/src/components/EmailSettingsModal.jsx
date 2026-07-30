import React, { useEffect, useState } from 'react';
import { X, Mail } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One-time settings modal for the reminder email address.
 * The address is saved locally and reused automatically for every task
 * that has a due date, instead of being re-entered per task.
 */
function EmailSettingsModal({ isOpen, currentEmail, onClose, onSave }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(currentEmail || '');
      setError('');
    }
  }, [isOpen, currentEmail]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    onSave(trimmed);
    onClose();
  };

  const handleClear = () => {
    onSave('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Mail size={18} className="text-indigo-600" />
            Reminder Email
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Set this once. Any task with a due date will automatically send reminders to this
          address 30 min before, 5 min before, and at the due time — as long as it's still in
          "To Do".
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              error ? 'border-red-400' : 'border-slate-300'
            }`}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            {currentEmail ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                Remove email
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmailSettingsModal;
