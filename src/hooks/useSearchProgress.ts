import { useState, useEffect } from 'react'

type UseSearchProgressOptions = {
  isLoading: boolean
  estimatedDuration?: number
}

export function useSearchProgress({
  isLoading,
  estimatedDuration = 4000,
}: UseSearchProgressOptions): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setProgress(100)
      return
    }

    setProgress(0)
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const ratio = Math.min(elapsed / estimatedDuration, 1)
      // Ease-out curve: rapid start (0→30% in 20%), plateau (30→70%), slow (70→92%)
      // Cap at 92% — the final snap to 100% comes when isLoading becomes false
      const curved = Math.min(92, 100 * (1 - Math.pow(1 - ratio, 2.5)))
      setProgress(Math.round(curved))
      if (ratio >= 1) clearInterval(interval)
    }, 50)

    return () => clearInterval(interval)
  }, [isLoading, estimatedDuration])

  return progress
}
