'use client'

export function AttackTopology({ activeNode, onSelectNode }: { activeNode: string; onSelectNode: (nodeId: string) => void }) {
  const nodes = [
    {
      id: 'ws-07',
      label: 'WS-07\nLow Privilege',
      x: '26%',
      y: '50%',
      tone: 'emerald',
    },
    {
      id: 'file-server',
      label: 'File Server\n10.10.20.20\nRestricted',
      x: '74%',
      y: '50%',
      tone: 'blue',
    },
  ]

  return (
    <div className="terminal-grid relative h-72 w-full overflow-hidden rounded-lg border border-border bg-card">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Challenge topology">
        <defs>
          <linearGradient id="linkGlow" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <line x1="38" y1="50" x2="62" y2="50" stroke="url(#linkGlow)" strokeWidth="1.2" strokeDasharray="2 2" />
        <text x="50" y="42" fill="#cbd5e1" fontSize="3.3" fontFamily="monospace" textAnchor="middle">Authenticated Access</text>
      </svg>

      {nodes.map((node) => {
        const selected = activeNode === node.id
        const accent = node.tone === 'emerald' ? '#14b8a6' : '#3b82f6'

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelectNode(node.id)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border bg-slate-900/90 font-mono text-[10px] text-slate-100 transition hover:scale-[1.02]"
            style={{
              left: node.x,
              top: node.y,
              width: node.id === 'ws-07' ? 146 : 176,
              height: node.id === 'ws-07' ? 74 : 88,
              borderColor: selected ? `${accent}cc` : 'rgba(71, 85, 105, 0.9)',
              boxShadow: selected ? `0 0 0 1px ${accent}, 0 0 18px ${accent}55` : 'none',
            }}
          >
            <div className="whitespace-pre-line px-2 text-center leading-4">
              {node.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
