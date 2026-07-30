import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard.jsx';

const COLUMN_STYLES = {
  TODO: { dot: 'bg-slate-400', header: 'text-slate-700' },
  IN_PROGRESS: { dot: 'bg-amber-400', header: 'text-amber-700' },
  DONE: { dot: 'bg-emerald-400', header: 'text-emerald-700' },
};

function Column({ columnId, title, tasks, onAddTask, onEditTask, onDeleteTask }) {
  const styles = COLUMN_STYLES[columnId];

  return (
    <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 w-full min-w-[280px] max-h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
          <h2 className={`text-sm font-semibold ${styles.header}`}>{title}</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddTask(columnId)}
          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
          aria-label={`Add task to ${title}`}
        >
          <Plus size={16} />
        </button>
      </div>

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 min-h-[120px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-50' : ''
            }`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-xs text-slate-400 text-center mt-6">No tasks yet</p>
            )}
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default Column;
