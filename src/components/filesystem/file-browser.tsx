'use client'

import type { SimFile, SimHost } from '@/types/simulator'

function getFileItems(files: Record<string, SimFile>, currentPath: string) {
  return Object.values(files)
    .filter((file) => file.path.startsWith(currentPath) || file.path.includes(currentPath))
    .slice(0, 12)
}

export function FileBrowser({ host, currentPath, selectedView }: { host: SimHost; currentPath: string; selectedView: string }) {
  const items = getFileItems(host.files, currentPath)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{selectedView === 'terminal' ? 'WS-07' : 'File Server'}</div>
          <div className="font-mono text-sm text-emerald-200">{host.hostname}</div>
        </div>
        <div className="font-mono text-xs text-slate-400">{currentPath}</div>
      </div>

      <div className="space-y-2 text-sm text-slate-200">
        {items.length === 0 ? (
          <div className="text-slate-500">No files found in this directory.</div>
        ) : (
          items.map((file, index) => (
            <div key={`${file.path}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-2">
              <span className="font-mono text-xs text-slate-100">{file.name}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{file.owner}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
