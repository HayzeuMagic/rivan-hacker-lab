'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  /** Fallback href when there is no history to go back to. */
  fallbackHref?: string
  label?: string
  className?: string
}

/**
 * Consistent "back" navigation control used across every page.
 * Prefers browser history; falls back to a stable route.
 */
export function BackButton({ fallbackHref = '/', label = 'Back', className = '' }: BackButtonProps) {
  const router = useRouter()

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }

  return (
    <button type="button" onClick={goBack} className={`btn-ghost btn-sm ${className}`} aria-label={label}>
      <ArrowLeft size={15} aria-hidden />
      <span>{label}</span>
    </button>
  )
}
