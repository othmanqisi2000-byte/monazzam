import React, { useEffect, useState } from 'react';
import { AlertCircle, LogOut, Plus, Users } from 'lucide-react';

function WorkspacePanel({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onLeaveWorkspace,
  onLoadMembers,
  onAddMember,
}) {
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null;
  const canManageMembers = activeWorkspace?.role === 'OWNER';
  const canLeaveWorkspace = Boolean(activeWorkspace && activeWorkspace.role !== 'OWNER');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!isMembersOpen) return;

    const loadMembers = async () => {
      if (!activeWorkspaceId) return;
      setIsLoadingMembers(true);
      setMembersError('');
      try {
        const data = await onLoadMembers(activeWorkspaceId);
        setMembers(data);
      } catch (error) {
        setMembersError(error.message || 'Failed to load members.');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadMembers();
  }, [activeWorkspaceId, isMembersOpen, onLoadMembers]);

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();
    if (!workspaceName.trim()) {
      setWorkspaceError('Workspace name is required.');
      return;
    }

    setWorkspaceError('');
    setIsCreating(true);
    try {
      const createdWorkspace = await onCreateWorkspace({ name: workspaceName.trim() });
      setWorkspaceName('');
      setIsCreateOpen(false);
      onSelectWorkspace(createdWorkspace.id);
    } catch (error) {
      setWorkspaceError(error.message || 'Failed to create workspace.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteMember = async (event) => {
    event.preventDefault();
    if (!memberEmail.trim()) {
      setInviteError('Member email is required.');
      return;
    }

    setInviteError('');
    setIsInviting(true);
    try {
      const newMember = await onAddMember(activeWorkspaceId, { email: memberEmail.trim() });
      setMembers((prev) => [...prev, newMember]);
      setMemberEmail('');
    } catch (error) {
      setInviteError(error.message || 'Failed to add member.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspaceId || !canLeaveWorkspace) return;

    const confirmed = window.confirm(
      `Leave ${activeWorkspace?.name || 'this community'}? You will lose access to its tasks and members.`
    );
    if (!confirmed) return;

    setLeaveError('');
    setIsLeaving(true);
    try {
      await onLeaveWorkspace(activeWorkspaceId);
      setIsMembersOpen(false);
    } catch (error) {
      setLeaveError(error.message || 'Failed to leave the community.');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Shared workspace</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={activeWorkspaceId}
                onChange={(event) => onSelectWorkspace(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.role})
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">
                {activeWorkspace ? `${activeWorkspace.memberCount} member(s) • ${activeWorkspace.taskCount} task(s)` : 'No workspace selected'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Plus size={16} />
              New Space
            </button>
            <button
              type="button"
              onClick={() => setIsMembersOpen(true)}
              disabled={!activeWorkspaceId}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Users size={16} />
              Members
            </button>
            {canLeaveWorkspace && (
              <button
                type="button"
                onClick={handleLeaveWorkspace}
                disabled={isLeaving}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut size={16} />
                {isLeaving ? 'Leaving...' : 'Leave Community'}
              </button>
            )}
          </div>
        </div>
        {leaveError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} />
            {leaveError}
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => setIsCreateOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Create a shared workspace</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create a place where you and other users can see and manage the same tasks together.
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleCreateWorkspace}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Workspace name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              {workspaceError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {workspaceError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMembersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => setIsMembersOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">
              {activeWorkspace ? `${activeWorkspace.name} members` : 'Workspace members'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Add registered users by email so they can work on the same tasks with you.
            </p>
            {!canManageMembers && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You can view members here, but only the workspace owner can add new people.
              </div>
            )}
            {canLeaveWorkspace && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Want to leave this community? You can remove yourself at any time.
                </p>
                <button
                  type="button"
                  onClick={handleLeaveWorkspace}
                  disabled={isLeaving}
                  className="shrink-0 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLeaving ? 'Leaving...' : 'Leave'}
                </button>
              </div>
            )}
            {leaveError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} />
                {leaveError}
              </div>
            )}

            <form className="mt-5 flex gap-2" onSubmit={handleInviteMember}>
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="teammate@example.com"
                disabled={!canManageMembers}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={isInviting || !activeWorkspaceId || !canManageMembers}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
              >
                {isInviting ? 'Adding...' : 'Add'}
              </button>
            </form>

            {inviteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} />
                {inviteError}
              </div>
            )}

            <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
              {isLoadingMembers ? (
                <div className="text-sm text-slate-500">Loading members...</div>
              ) : membersError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} />
                  {membersError}
                </div>
              ) : members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  No members yet.
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.email}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {member.role}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMembersOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WorkspacePanel;
