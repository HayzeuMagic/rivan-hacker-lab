import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rivan Cybersecurity Institute — Cybersecurity Training Lab',
  description: 'Authorized cybersecurity training in an isolated lab environment.',
  openGraph: {
    title: 'Rivan Cybersecurity Institute — Cybersecurity Training Lab',
    description: 'Hands-on security training in an isolated, authorized environment.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
