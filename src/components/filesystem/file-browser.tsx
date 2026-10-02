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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="lab-kicker">{selectedView === 'terminal' ? 'WS-07' : 'File Server'}</div>
          <div className="mt-1 font-mono text-sm text-emerald-300">{host.hostname}</div>
        </div>
        <div className="font-mono text-xs text-slate-400">{currentPath}</div>
      </div>

      <div className="space-y-2 text-sm text-slate-200">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-slate-500">No files found in this directory.</div>
        ) : (
          items.map((file, index) => (
            <div key={`${file.path}-${index}`} className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2">
              <span className="font-mono text-xs text-slate-100">{file.name}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{file.owner}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
