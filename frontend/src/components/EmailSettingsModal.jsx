import React, { useEffect, useState } from 'react';
import { X, Mail } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One-time settings modal for the reminder email address.
 * If left empty, reminders fall back to the user's account email.
 */
function EmailSettingsModal({ isOpen, currentEmail, onClose, onSave }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(currentEmail || '');
      setError('');
      setIsSaving(false);
    }
  }, [isOpen, currentEmail]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Failed to save reminder email.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setError('');
    setIsSaving(true);
    try {
      await onSave('');
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Failed to remove reminder email.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Mail size={18} className="text-indigo-600" />
            Reminder Email
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Set this once. Any task with a due date will automatically send reminders to this
          address 30 min before, 5 min before, and at the due time as long as it is still in
          "To Do". If you leave this empty, reminders go to your account email instead.
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

          <div className="flex items-center justify-between pt-1">
            {currentEmail ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving}
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
                disabled={isSaving}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmailSettingsModal;
