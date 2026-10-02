'use client'

import { useEffect, useRef, useState } from 'react'
import type { LabLine } from '@/lib/lab/terminal'

interface KaliTerminalProps {
  /** Lab API namespace, e.g. '/api/nse' */
  endpoint: string
  title?: string
  onProgress?: (progress: Record<string, boolean>) => void
}

const DEFAULT_PROMPT = '┌──(kali㉿kali)-[~]\n└─$'

export function KaliTerminal({ endpoint, title = 'Kali Linux', onProgress }: KaliTerminalProps) {
  const [lines, setLines] = useState<LabLine[]>([])
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [command, setCommand] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const draft = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const commandHistory = lines.filter((line) => line.kind === 'input').map((line) => line.text)

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`${endpoint}/terminal`, { cache: 'no-store' })
      const body = (await response.json()) as { lines: LabLine[]; prompt: string }
      setLines(body.lines)
      setPrompt(body.prompt)
    }
    void load()
  }, [endpoint])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [lines])

  const submitCommand = async () => {
    const trimmed = command.trim()
    if (!trimmed) return
    setCommand('')
    setHistoryIndex(-1)
    draft.current = ''

    const response = await fetch(`${endpoint}/terminal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ command: trimmed }),
    })
    const body = (await response.json()) as { lines: LabLine[]; prompt: string; progress?: Record<string, boolean> }
    setLines(body.lines)
    setPrompt(body.prompt)
    if (body.progress && onProgress) onProgress(body.progress)
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
    <div className="flex h-[460px] flex-col overflow-hidden rounded-lg border border-border bg-[#0a0e14] text-sm shadow-lg">
      <div className="flex items-center justify-between border-b border-border bg-slate-900 px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs text-slate-300">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </span>
          <span className="ml-2 font-mono">kali@kali: ~</span>
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{title}</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-auto p-4 font-mono text-[13px] leading-5">
        {lines.map((line, index) => {
          if (line.kind === 'input') {
            return (
              <div key={index} className="whitespace-pre-wrap text-slate-100">
                <span className="text-emerald-400">{line.prompt ?? prompt}</span> <span className="text-white">{line.text}</span>
              </div>
            )
          }
          const tone =
            line.kind === 'error'
              ? 'text-rose-300'
              : line.kind === 'success'
                ? 'text-emerald-300'
                : line.kind === 'system'
                  ? 'text-sky-300'
                  : 'text-slate-300'
          return (
            <div key={index} className={`whitespace-pre-wrap ${tone}`}>
              {line.text}
            </div>
          )
        })}
      </div>

      <form
        className="flex items-start gap-2 border-t border-border bg-slate-900 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submitCommand()
        }}
      >
        <span className="whitespace-pre-wrap font-mono text-[13px] leading-5 text-emerald-400">{prompt}</span>
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
          className="min-w-0 flex-1 border-none bg-transparent font-mono text-[13px] leading-5 text-white caret-emerald-300 outline-none"
          placeholder=""
        />
      </form>
    </div>
  )
}
