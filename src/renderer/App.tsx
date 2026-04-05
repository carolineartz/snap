import { useEffect, useState } from 'react';

export function App() {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    window.snappy.app.version().then(setVersion);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-neutral-900 text-white">
      <header className="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
        <h1 className="text-lg font-semibold">Snappy</h1>
        {version && (
          <span className="text-xs text-neutral-400">v{version}</span>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="text-center">
          <p className="text-neutral-400">No snaps yet</p>
          <p className="mt-2 text-sm text-neutral-500">
            Take a screenshot to get started
          </p>
        </div>
      </main>
    </div>
  );
}
