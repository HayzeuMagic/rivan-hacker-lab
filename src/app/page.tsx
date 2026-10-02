'use client'

import Image from 'next/image'
import { ArrowUpRight, CircleDot, Network, Server } from 'lucide-react'
import { challengeCatalog, type ChallengeInfo } from '@/lib/challenges'

function DashboardCard({ challenge }: { challenge: ChallengeInfo }) {
  return (
    <article className="lab-surface group flex flex-col p-5 transition-colors duration-150 hover:border-slate-600">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lab-kicker mb-2">Challenge {String(challenge.number).padStart(2, '0')}</p>
          <h2 className="text-lg font-semibold leading-snug text-white">{challenge.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{challenge.service}</p>
        </div>
        <span className="chip shrink-0 border-emerald-400/30 text-emerald-300">
          <CircleDot size={11} />
          {challenge.status}
        </span>
      </div>
      <p className="mb-4 text-[13px] leading-5 text-slate-400">{challenge.summary}</p>
      <div className="mb-4 border-y border-border py-3">
        <p className="lab-kicker">Target</p>
        <p className="mt-1 truncate font-mono text-sm text-cyan-300">{challenge.target}</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {challenge.tags.map((tag) => (
          <span key={tag} className="chip">
            {tag}
          </span>
        ))}
        <span className="chip border-amber-400/30 text-amber-200">{challenge.difficulty}</span>
      </div>
      <button
        className="btn-primary mt-auto w-full"
        onClick={() => window.location.assign(`/challenges/${challenge.id}`)}
      >
        Open challenge <ArrowUpRight size={15} />
      </button>
    </article>
  )
}

export default function HomePage() {
  return (
    <main className="lab-ambient min-h-screen px-5 py-8 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-border pb-7">
          <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            <Network size={15} /> Rivan Cybersecurity Institute / authorized environment
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex items-center gap-5">
              <Image src="/logo/rivan_logo.png" alt="Rivan Cybersecurity Institute" width={72} height={72} className="rounded-md" priority />
              <div>
                <h1 className="font-mono text-4xl font-bold tracking-tight text-white sm:text-5xl">Rivan Hacker Lab</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  The official hands-on red-team laboratory of Rivan Cybersecurity Institute. Nine authorized, isolated
                  offensive-security challenges spanning web, network, credential, and post-exploitation disciplines.
                </p>
              </div>
            </div>
            <div className="lab-surface px-4 py-3 font-mono text-xs text-slate-300">
              <span className="text-slate-500">SCOPE</span> 10.20.0.0/16
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          <div className="bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-cyan-300">
              <Server size={16} />
              <span className="lab-kicker">Lab network</span>
            </div>
            <p className="font-mono text-sm text-slate-200">10.20.0.0/16</p>
          </div>
          <div className="bg-card p-4">
            <p className="lab-kicker">Online services</p>
            <p className="mt-2 font-mono text-sm text-emerald-300">9 / 9 deployed</p>
          </div>
          <div className="bg-card p-4">
            <p className="lab-kicker">Operator</p>
            <p className="mt-2 font-mono text-sm text-slate-200">analyst / authorized</p>
          </div>
        </section>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="lab-kicker">Target environment</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Nine-challenge assessment path</h2>
          </div>
          <p className="text-right text-xs text-slate-500">Each service is independently resettable.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {challengeCatalog.map((challenge) => (
            <DashboardCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </div>
    </main>
  )
}
