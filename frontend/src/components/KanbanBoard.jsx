import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Plus, AlertCircle, Loader2, Mail } from 'lucide-react';
import Column from './Column.jsx';
import TaskModal from './TaskModal.jsx';
import EmailSettingsModal from './EmailSettingsModal.jsx';
import WorkspacePanel from './WorkspacePanel.jsx';
import { taskApi } from '../services/api.js';

const COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' },
];

function reindex(taskList) {
  return taskList.map((t, index) => ({ ...t, order: index }));
}

function KanbanBoard({
  currentUser,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onLoadWorkspaceMembers,
  onAddWorkspaceMember,
  reminderEmail,
  onSaveReminderEmail,
}) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, task: null, defaultStatus: 'TODO' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!activeWorkspaceId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await taskApi.getAllTasks(activeWorkspaceId);
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const tasksByColumn = useMemo(() => {
    const grouped = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const task of tasks) {
      if (grouped[task.status]) grouped[task.status].push(task);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [tasks]);

  // --- Drag and drop handler ---
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    const previousTasks = tasks;

    // Build the new local state optimistically.
    const sourceList = [...tasksByColumn[sourceStatus]];
    const [movedTask] = sourceList.splice(source.index, 1);

    let destList;
    if (sourceStatus === destStatus) {
      destList = sourceList;
      destList.splice(destination.index, 0, { ...movedTask, status: destStatus });
    } else {
      destList = [...tasksByColumn[destStatus]];
      destList.splice(destination.index, 0, { ...movedTask, status: destStatus });
    }

    const reindexedSource = reindex(sourceList);
    const reindexedDest = sourceStatus === destStatus ? reindexedSource : reindex(destList);

    const otherTasks = tasks.filter(
      (t) => t.status !== sourceStatus && t.status !== destStatus
    );

    const nextTasks =
      sourceStatus === destStatus
        ? [...otherTasks, ...reindexedDest]
        : [...otherTasks, ...reindexedSource, ...reindexedDest];

    setTasks(nextTasks);
    setIsSavingOrder(true);
    setError(null);

    // Only the affected column(s) need to be persisted.
    const affectedTasks =
      sourceStatus === destStatus
        ? reindexedDest.map((t) => ({ id: t.id, status: t.status, order: t.order }))
        : [...reindexedSource, ...reindexedDest].map((t) => ({
            id: t.id,
            status: t.status,
            order: t.order,
          }));

    try {
      await taskApi.reorderTasks(activeWorkspaceId, affectedTasks);
    } catch (err) {
      setError(err.message || 'Failed to save the new order. Reverting.');
      setTasks(previousTasks);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // --- Create / Edit ---
  const openCreateModal = (status) => {
    setModalState({ isOpen: true, task: null, defaultStatus: status });
  };

  const openEditModal = (task) => {
    setModalState({ isOpen: true, task, defaultStatus: task.status });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, task: null, defaultStatus: 'TODO' });
  };

  const handleModalSubmit = async (formData) => {
    if (modalState.task) {
      const updated = await taskApi.updateTask(activeWorkspaceId, modalState.task.id, formData);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await taskApi.createTask(activeWorkspaceId, formData);
      setTasks((prev) => [...prev, created]);
    }
  };

  // --- Delete ---
  const requestDelete = (task) => setDeleteTarget(task);
  const cancelDelete = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
    try {
      await taskApi.deleteTask(activeWorkspaceId, deleteTarget.id);
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
      setTasks(previousTasks);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading board...
      </div>
    );
  }

  return (
    <div>
      <WorkspacePanel
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={onCreateWorkspace}
        onLoadMembers={onLoadWorkspaceMembers}
        onAddMember={onAddWorkspaceMember}
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex justify-end items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setIsEmailSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-200"
          title={reminderEmail ? `Reminders sent to ${reminderEmail}` : 'Set a reminder email'}
        >
          <Mail size={16} />
          {reminderEmail ? reminderEmail : 'Set Reminder Email'}
        </button>
        <button
          type="button"
          onClick={() => openCreateModal('TODO')}
          disabled={!activeWorkspaceId}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {activeWorkspaceId ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                columnId={col.id}
                title={col.title}
                tasks={tasksByColumn[col.id]}
                onAddTask={openCreateModal}
                onEditTask={openEditModal}
                onDeleteTask={requestDelete}
              />
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Create or choose a workspace to start collaborating on tasks.
        </div>
      )}

      {isSavingOrder && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-md">
          <Loader2 className="animate-spin" size={12} />
          Saving...
        </div>
      )}

      <TaskModal
        isOpen={modalState.isOpen}
        task={modalState.task}
        defaultStatus={modalState.defaultStatus}
        globalReminderEmail={reminderEmail}
        onOpenEmailSettings={() => setIsEmailSettingsOpen(true)}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />

      <EmailSettingsModal
        isOpen={isEmailSettingsOpen}
        currentEmail={reminderEmail}
        onClose={() => setIsEmailSettingsOpen(false)}
        onSave={onSaveReminderEmail}
      />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          onClick={cancelDelete}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete task?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete "{deleteTarget.title}". This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
