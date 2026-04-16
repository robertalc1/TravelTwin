import { useState, useEffect } from 'react'

const MESSAGES = [
  'Searching 50+ airlines for the best deals',
  'Checking flights from Amadeus',
  'Comparing prices in real-time',
  'Finding hidden gems for your trip',
  'Almost there, finalizing results',
] as const

export function useSearchMessages(isActive: boolean, intervalMs = 1500): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setIndex(0)
      return
    }
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % MESSAGES.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [isActive, intervalMs])

  return MESSAGES[index]
}
