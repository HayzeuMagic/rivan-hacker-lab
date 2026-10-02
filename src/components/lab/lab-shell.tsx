'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Flag, Lightbulb, RotateCcw, ShieldCheck } from 'lucide-react'
export interface LabObjective {
  id: string
  label: string
}

export interface LabHint {
  title: string
  body: string
}

interface LabShellProps {
  number: number
  title: string
  difficulty: string
  organisation: string
  brief: string
  target: string
  targetDetail: string
  objectives: LabObjective[]
  progress: Record<string, boolean>
  hints: LabHint[]
  message: string
  completed: boolean
  onSubmitFlag: (flag: string) => Promise<void>
  onReset: () => void
  flagPlaceholder?: string
  children: React.ReactNode
}

function HintPanel({ hints }: { hints: LabHint[] }) {
  const [revealed, setRevealed] = useState(0)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Hints</h2>
        <span className="font-mono text-[10px] text-slate-500">{revealed}/{hints.length}</span>
      </div>
      <ol className="space-y-3">
        {hints.map((hint, index) => (
          <li key={hint.title} className="rounded-md border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Hint {index + 1} — {hint.title}
              </p>
            </div>
            {index < revealed ? (
              <p className="mt-2 text-xs leading-5 text-slate-300">{hint.body}</p>
            ) : (
              index === revealed && (
                <button
                  className="btn-ghost btn-sm mt-2 text-amber-200 hover:text-amber-100"
                  onClick={() => setRevealed((value) => Math.min(value + 1, hints.length))}
                >
                  <Lightbulb size={12} /> Reveal
                </button>
              )
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function LabShell(props: LabShellProps) {
  const [flag, setFlag] = useState('')
  const completedCount = props.objectives.filter((objective) => props.progress[objective.id]).length

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
              <Image src="/logo/rivan_logo.png" alt="Rivan Cybersecurity Institute" width={40} height={40} className="rounded-sm" />
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Challenge {String(props.number).padStart(2, '0')} / {props.organisation}
              </p>
              <h1 className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">{props.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{props.brief}</p>
            </div>
            <span className="chip normal-case tracking-[0.12em]">
              {props.difficulty}
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="min-w-0 space-y-5">
            <div className="lab-surface p-5">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Mission brief</h2>
              </div>
              <p className="text-sm leading-6 text-slate-400">{props.brief}</p>
              <div className="mt-4 border-t border-slate-800 pt-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Target</p>
                <p className="mt-1 font-mono text-sm text-cyan-200">{props.target}</p>
                <p className="mt-1 text-xs text-slate-500">{props.targetDetail}</p>
              </div>
            </div>
            {props.children}
          </section>

          <aside className="space-y-5">
            <div className="lab-surface p-5">
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
                {props.objectives.map((objective) => (
                  <li className="flex items-start gap-3 text-sm" key={objective.id}>
                    <span className={props.progress[objective.id] ? 'text-emerald-300' : 'text-slate-600'}>
                      {props.progress[objective.id] ? '✓' : '○'}
                    </span>
                    <span className={props.progress[objective.id] ? 'text-slate-200' : 'text-slate-500'}>{objective.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lab-surface p-5">
              <HintPanel hints={props.hints} />
            </div>

            <div className="lab-surface p-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Flag submission</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">{props.message}</p>
              {props.completed ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                  <Flag size={16} /> Challenge complete
                </div>
              ) : (
                <form className="mt-4 flex gap-2" onSubmit={submit}>
                  <input
                    className="field min-w-0 flex-1 font-mono text-xs"
                    aria-label="Flag"
                    placeholder={props.flagPlaceholder ?? 'RIVAN{...}'}
                    value={flag}
                    onChange={(event) => setFlag(event.target.value)}
                  />
                  <button className="btn-primary btn-sm" type="submit">
                    Submit
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[10px] uppercase tracking-[0.18em] text-slate-600">
          <span>Rivan Cybersecurity Institute — Rivan Hacker Lab</span>
          <span>Authorized training environment only</span>
        </footer>
      </div>
    </main>
  )
}
