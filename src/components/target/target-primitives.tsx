'use client'

import { BackButton } from '@/components/ui/back-button'

/**
 * Shared presentational primitives for the simulated "target websites".
 * These are intentionally light-themed, believable corporate sites that host
 * the lab vulnerabilities. They only control presentation — challenge logic
 * stays in the API routes.
 */

export const lightInput =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20'

export const lightPrimaryBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:pointer-events-none disabled:opacity-50'

export const lightDarkBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:pointer-events-none disabled:opacity-50'

export const lightGhostBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30'

export function TargetCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>
}

export function ResultPanel({ result, minHeight = 'min-h-28' }: { result: Record<string, unknown>; minHeight?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Response</p>
      </div>
      <pre className={`${minHeight} whitespace-pre-wrap break-words bg-slate-950 p-5 font-mono text-xs leading-5 text-emerald-300`}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

interface TargetHeaderProps {
  organisation: string
  title: string
  host: string
  accentClass?: string
  initials: string
  backHref: string
}

export function TargetHeader({ organisation, title, host, accentClass = 'text-teal-700', initials, backHref }: TargetHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 font-mono text-sm font-bold text-white">
            {initials}
          </div>
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${accentClass}`}>{organisation}</p>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-slate-400 sm:inline">{host}</span>
          <BackButton fallbackHref={backHref} label="Back" className="!text-slate-600 hover:!bg-slate-200" />
        </div>
      </div>
    </header>
  )
}
