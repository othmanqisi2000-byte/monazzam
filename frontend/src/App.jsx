import React, { useEffect, useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import AppShell from './components/AppShell.jsx';
import AuthPage from './components/AuthPage.jsx';
import KanbanBoard from './components/KanbanBoard.jsx';
import {
  authApi,
  getStoredAuthToken,
  getStoredWorkspaceId,
  setStoredAuthToken,
  setStoredWorkspaceId,
  workspaceApi,
} from './services/api.js';

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');

  const syncWorkspaces = async (preferredWorkspaceId = '') => {
    const data = await workspaceApi.getAll();
    setWorkspaces(data);

    const storedWorkspaceId = preferredWorkspaceId || getStoredWorkspaceId();
    const availableWorkspaceIds = new Set(data.map((workspace) => workspace.id));
    const nextWorkspaceId = availableWorkspaceIds.has(storedWorkspaceId)
      ? storedWorkspaceId
      : data[0]?.id || '';

    setActiveWorkspaceId(nextWorkspaceId);
    setStoredWorkspaceId(nextWorkspaceId);
    return data;
  };

  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredAuthToken();
      if (!token) {
        setIsRestoringSession(false);
        return;
      }

      try {
        const user = await authApi.getCurrentUser();
        setCurrentUser(user);
        await syncWorkspaces();
      } catch (error) {
        setStoredAuthToken('');
        setStoredWorkspaceId('');
        setCurrentUser(null);
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

  const handleAuthSubmit = async (payload) => {
    const response =
      authMode === 'register' ? await authApi.register(payload) : await authApi.login(payload);

    setStoredAuthToken(response.token);
    setCurrentUser(response.user);
    await syncWorkspaces();
  };

  const handleLogout = () => {
    setStoredAuthToken('');
    setStoredWorkspaceId('');
    setCurrentUser(null);
    setWorkspaces([]);
    setActiveWorkspaceId('');
    setAuthMode('login');
  };

  const handleReminderEmailSave = async (email) => {
    const updatedUser = await authApi.updateProfile({ reminderEmail: email });
    setCurrentUser(updatedUser);
  };

  if (isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Restoring your workspace...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage
        mode={authMode}
        onSwitchMode={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <AppShell
      subtitle={
        activeWorkspaceId
          ? `Welcome back, ${currentUser.name}. Working in ${workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.name || 'your workspace'}`
          : `Welcome back, ${currentUser.name}`
      }
      actions={
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut size={16} />
          Logout
        </button>
      }
    >
      <KanbanBoard
        currentUser={currentUser}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={(workspaceId) => {
          setActiveWorkspaceId(workspaceId);
          setStoredWorkspaceId(workspaceId);
        }}
        onCreateWorkspace={async (payload) => {
          const createdWorkspace = await workspaceApi.create(payload);
          setWorkspaces((prev) => [...prev, createdWorkspace]);
          return createdWorkspace;
        }}
        onDeleteWorkspace={async (workspaceId) => {
          await workspaceApi.delete(workspaceId);
          await syncWorkspaces();
        }}
        onLeaveWorkspace={async (workspaceId) => {
          await workspaceApi.leave(workspaceId);
          await syncWorkspaces();
        }}
        onLoadWorkspaceMembers={(workspaceId) => workspaceApi.getMembers(workspaceId)}
        onAddWorkspaceMember={(workspaceId, payload) => workspaceApi.addMember(workspaceId, payload)}
        reminderEmail={currentUser.reminderEmail || ''}
        onSaveReminderEmail={handleReminderEmailSave}
      />
    </AppShell>
  );
}

export default App;
