import React from 'react';

function AppShell({ title, subtitle, actions, children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">monazzan</h1>
            <p className="text-sm text-slate-500">{subtitle || 'Plan, track, and ship your work'}</p>
          </div>
          {actions}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {title ? <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2> : null}
        {children}
      </main>
    </div>
  );
}

export default AppShell;
