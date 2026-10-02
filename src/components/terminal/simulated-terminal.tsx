'use client'

import { useRef, useState } from 'react'
import type { TerminalLine } from '@/types/simulator'

export function SimulatedTerminal({ lines, prompt, onSubmit, label = 'KALI-LAB' }: { lines: TerminalLine[]; prompt: string; onSubmit: (value: string) => void; label?: string }) {
  const [command, setCommand] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const draft = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)
  const commandHistory = lines.filter((line) => line.kind === 'input').map((line) => line.text)

  const submitCommand = () => {
    const trimmedCommand = command.trim()
    if (!trimmedCommand) return

    onSubmit(trimmedCommand)
    setCommand('')
    setHistoryIndex(-1)
    draft.current = ''
    inputRef.current?.focus()
  }

  const navigateHistory = (direction: 'older' | 'newer') => {
    if (!commandHistory.length) return

    if (direction === 'older') {
      if (historyIndex === -1) draft.current = command
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(historyIndex - 1, 0)
      setHistoryIndex(nextIndex)
      setCommand(commandHistory[nextIndex])
      return
    }

    if (historyIndex === -1) return
    const nextIndex = historyIndex + 1
    if (nextIndex >= commandHistory.length) {
      setHistoryIndex(-1)
      setCommand(draft.current)
      return
    }
    setHistoryIndex(nextIndex)
    setCommand(commandHistory[nextIndex])
  }

  return (
    <div className="flex h-[420px] flex-col overflow-hidden rounded-lg border border-border bg-[#0a0e14] text-sm text-emerald-300 shadow-lg">
      <div className="flex items-center justify-between border-b border-border bg-slate-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span>Simulated Terminal</span>
        <span className="font-mono normal-case tracking-normal text-slate-500">{label}</span>
      </div>
      <div className="terminal-grid flex-1 space-y-2 overflow-auto p-4 font-mono">
        {lines.map((line) => (
          <div
            key={line.id}
            className={line.kind === 'input'
              ? 'rounded border border-emerald-500/20 bg-emerald-950/30 px-3 py-2 text-emerald-100'
              : line.kind === 'error'
                ? 'border-l-2 border-rose-400/60 pl-3 text-rose-300'
                : line.kind === 'success'
                  ? 'border-l-2 border-emerald-400/60 pl-3 text-emerald-200'
                  : line.kind === 'system'
                    ? 'border-l-2 border-sky-400/60 pl-3 text-sky-300'
                    : 'border-l-2 border-slate-700 pl-3 text-slate-200'}
          >
            {line.kind === 'input' ? (
              <><span className="text-emerald-300">{line.prompt ?? prompt}</span> {line.text}</>
            ) : (
              <span className="whitespace-pre-wrap">{line.text}</span>
            )}
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2 border-t border-border bg-slate-900 p-3"
        onSubmit={(event) => {
          event.preventDefault()
          submitCommand()
        }}
      >
        <span className="font-mono text-emerald-300">{prompt}</span>
        <input
          name="command"
          autoComplete="off"
          autoFocus
          aria-label="Terminal command"
          ref={inputRef}
          value={command}
          onChange={(event) => {
            setCommand(event.target.value)
            setHistoryIndex(-1)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              navigateHistory('older')
            } else if (event.key === 'ArrowDown') {
              event.preventDefault()
              navigateHistory('newer')
            }
          }}
          className="ml-2 flex-1 border-none bg-transparent font-mono text-emerald-200 outline-none placeholder:text-slate-500"
          placeholder=""
        />
      </form>
    </div>
  )
}
