'use client'

import { ArrowUpRight, CircleDot, Network, Server } from 'lucide-react'
import { challengeCatalog } from '@/simulator/core/engine'

function DashboardCard({ id, title, tags, status, target, service, available }: { id: string; title: string; tags: string[]; status: string; target: string; service: string; available: boolean }) {
  return (
    <article className="border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-600">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{id}</p>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{service}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${available ? 'border-emerald-400/30 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>
          <CircleDot size={11} />
          {status}
        </span>
      </div>
      <div className="mb-4 border-y border-slate-800 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Target</p>
        <p className="mt-1 font-mono text-sm text-cyan-200">{target}</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
            {tag}
          </span>
        ))}
      </div>
      <button
        className={`inline-flex w-full items-center justify-center gap-2 border px-3 py-2 text-sm font-medium transition ${available ? 'border-emerald-400/50 bg-emerald-400 text-slate-950 hover:bg-emerald-300' : 'cursor-not-allowed border-slate-800 bg-slate-800 text-slate-500'}`}
        disabled={!available}
        onClick={() => window.location.assign(`/challenges/${id}`)}
      >
        {available ? <>Open target <ArrowUpRight size={15} /></> : 'Service not deployed'}
      </button>
    </article>
  )
}

export default function HomePage() {
  const deployedServices = challengeCatalog.filter((challenge) => challenge.status === 'Available').length

  return (
    <main className="min-h-screen bg-[#080b12] px-5 py-8 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-slate-800 pb-7">
          <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300"><Network size={15} /> CYBERLAB / authorized environment</div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-mono text-4xl font-bold tracking-tight text-white sm:text-6xl">Northstar Logistics</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Isolated corporate network for practical penetration-testing training. Enumerate services, test hypotheses, and document evidence inside the authorized lab.</p>
            </div>
            <div className="border border-slate-800 bg-slate-900/60 px-4 py-3 font-mono text-xs text-slate-300"><span className="text-slate-500">SCOPE</span> 10.20.0.0/16</div>
          </div>
        </header>

        <section className="mb-8 grid gap-px border border-slate-800 bg-slate-800 sm:grid-cols-3">
          <div className="bg-[#0d121b] p-4"><div className="mb-2 flex items-center gap-2 text-cyan-300"><Server size={16} /><span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Lab network</span></div><p className="font-mono text-sm text-slate-200">10.20.0.0/16</p></div>
          <div className="bg-[#0d121b] p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Online services</p><p className="mt-2 font-mono text-sm text-emerald-300">{deployedServices} / {challengeCatalog.length} deployed</p></div>
          <div className="bg-[#0d121b] p-4"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Operator</p><p className="mt-2 font-mono text-sm text-slate-200">analyst / authorized</p></div>
        </section>

        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Target environment</p><h2 className="mt-1 text-2xl font-semibold text-white">Three-stage assessment</h2></div><p className="text-right text-xs text-slate-500">Each service is independently resettable.</p></div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {challengeCatalog.map((challenge) => (
            <DashboardCard
              key={challenge.id}
              id={challenge.id}
              title={challenge.title}
              tags={challenge.tags}
              status={challenge.status}
              available={challenge.status === 'Available'}
              target={challenge.target}
              service={challenge.service}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
