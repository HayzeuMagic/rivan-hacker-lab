'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Flag, RotateCcw } from 'lucide-react'
import { useState } from 'react'

export interface WebObjective {
  id: string
  label: string
}

interface WebChallengeShellProps {
  number: number
  organisation: string
  title: string
  brief: string
  targetHost: string
  targetPath: string
  scopeNote?: string
  objectives: readonly (readonly [string, string])[]
  progress: Record<string, boolean>
  message: string
  flagVisible: boolean
  completed: boolean
  onSubmitFlag: (flag: string) => Promise<void>
  onReset: () => void
}

/**
 * Shared shell for the web-target challenges (IDOR, Auth, SSRF).
 * Provides a consistent header with back navigation, target card,
 * status/flag card, and an objectives evidence panel.
 */
export function WebChallengeShell(props: WebChallengeShellProps) {
  const [flag, setFlag] = useState('')
  const completedCount = props.objectives.filter(([id]) => props.progress[id]).length

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!flag.trim()) return
    await props.onSubmitFlag(flag.trim())
    setFlag('')
  }

  return (
    <main className="lab-ambient min-h-screen px-4 py-6 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b border-border pb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo/rivan_logo.png" alt="Rivan Cybersecurity Institute" width={40} height={40} className="rounded-md" />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Rivan Hacker Lab</span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500">Rivan Cybersecurity Institute</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/" className="btn-ghost btn-sm">
                <ArrowLeft size={15} /> Dashboard
              </Link>
              <button className="btn-secondary btn-sm" onClick={props.onReset}>
                <RotateCcw size={15} /> Reset lab
              </button>
            </div>
          </div>
          <p className="lab-kicker mb-2">
            Challenge {String(props.number).padStart(2, '0')} / {props.organisation}
          </p>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">{props.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{props.brief}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="min-w-0 space-y-5">
            <div className="lab-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="lab-kicker">Target</p>
                  <p className="mt-1 font-mono text-sm text-cyan-300">{props.targetHost}</p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => window.open(props.targetPath, '_blank', 'noopener,noreferrer')}
                >
                  Open target <ExternalLink size={15} />
                </button>
              </div>
              {props.scopeNote && <p className="mt-4 text-xs leading-5 text-slate-500">{props.scopeNote}</p>}
            </div>

            <div className="lab-surface p-5">
              <p className="lab-kicker">Lab status</p>
              <p className="mt-2 text-sm text-slate-300">{props.message}</p>
              {props.flagVisible && !props.completed && (
                <form className="mt-4 flex gap-2" onSubmit={submit}>
                  <input
                    className="field min-w-0 flex-1 font-mono text-xs"
                    aria-label="Flag"
                    placeholder="RIVAN{...}"
                    value={flag}
                    onChange={(event) => setFlag(event.target.value)}
                  />
                  <button className="btn-primary btn-sm" type="submit">
                    Submit
                  </button>
                </form>
              )}
              {props.completed && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                  <Flag size={16} /> Challenge complete
                </div>
              )}
            </div>
          </section>

          <aside className="lab-surface h-fit p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Objectives</h2>
              <span className="font-mono text-sm text-primary">
                {completedCount}/{props.objectives.length}
              </span>
            </div>
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(completedCount / props.objectives.length) * 100}%` }}
              />
            </div>
            <ul className="space-y-3">
              {props.objectives.map(([id, label]) => (
                <li className="flex items-start gap-3 text-sm" key={id}>
                  <span className={props.progress[id] ? 'text-emerald-300' : 'text-slate-600'}>
                    {props.progress[id] ? '✓' : '○'}
                  </span>
                  <span className={props.progress[id] ? 'text-slate-200' : 'text-slate-500'}>{label}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  )
}
