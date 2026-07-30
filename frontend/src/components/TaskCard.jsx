import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Pencil, Trash2, GripVertical, Clock, Mail, Repeat } from 'lucide-react';

const STATUS_ACCENT = {
  TODO: 'border-l-slate-400',
  IN_PROGRESS: 'border-l-amber-400',
  DONE: 'border-l-emerald-400',
};

const DAY_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = { SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat' };

function formatRecurringDays(days) {
  if (!Array.isArray(days) || days.length === 0) return '';
  return DAY_ORDER.filter((d) => days.includes(d))
    .map((d) => DAY_LABELS[d])
    .join(', ');
}

function formatDueDate(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;

  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (!hasTime) return dateLabel;

  const timeLabel = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateLabel}, ${timeLabel}`;
}

function isOverdue(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function TaskCard({ task, index, onEdit, onDelete }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group bg-white rounded-lg border border-slate-200 border-l-4 ${
            STATUS_ACCENT[task.status]
          } shadow-sm p-3 mb-2 transition-shadow ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-300 rotate-1' : 'hover:shadow-md'
          }`}
        >
          <div className="flex items-start gap-2">
            <div
              {...provided.dragHandleProps}
              className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
              aria-label="Drag handle"
            >
              <GripVertical size={16} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 break-words">{task.title}</h3>
              {task.description && (
                <p className="text-xs text-slate-500 mt-1 break-words line-clamp-3">
                  {task.description}
                </p>
              )}
              {(task.dueDate || task.isRecurring) && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {task.isRecurring && (
                    <div
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-purple-600 bg-purple-50"
                      title={`Repeats: ${formatRecurringDays(task.recurringDays)}`}
                    >
                      <Repeat size={11} />
                      {formatRecurringDays(task.recurringDays)}
                    </div>
                  )}
                  {task.dueDate && (
                    <div
                      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                        isOverdue(task.dueDate) && task.status !== 'DONE'
                          ? 'text-red-600 bg-red-50'
                          : 'text-slate-500 bg-slate-100'
                      }`}
                    >
                      <Clock size={11} />
                      {formatDueDate(task.dueDate)}
                    </div>
                  )}
                  {task.reminderEmail && (
                    <div
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-indigo-600 bg-indigo-50"
                      title={`Reminders to ${task.reminderEmail}`}
                    >
                      <Mail size={11} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                aria-label="Edit task"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(task)}
                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                aria-label="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default TaskCard;
