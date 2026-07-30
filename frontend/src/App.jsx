import React from 'react';
import KanbanBoard from './components/KanbanBoard.jsx';

function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">monazzam</h1>
            <p className="text-sm text-slate-500">Plan, track, and ship your work</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        <KanbanBoard />
      </main>
    </div>
  );
}

export default App;
