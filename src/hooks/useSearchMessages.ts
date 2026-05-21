import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'

const MESSAGES_EN = [
  'Searching 50+ airlines for the best deals',
  'Checking live flights on Tripadvisor',
  'Comparing prices in real-time',
  'Finding hidden gems for your trip',
  'Almost there, finalizing results',
] as const

const MESSAGES_RO = [
  'Caut peste 50 de companii aeriene pentru cele mai bune oferte',
  'Verific zborurile live pe Tripadvisor',
  'Compar prețuri în timp real',
  'Găsesc comori ascunse pentru călătoria ta',
  'Aproape gata, finalizez rezultatele',
] as const

export function useSearchMessages(isActive: boolean, intervalMs = 1500): string {
  const locale = useLocale()
  const messages = locale === 'ro' ? MESSAGES_RO : MESSAGES_EN
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setIndex(0)
      return
    }
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % messages.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [isActive, intervalMs, messages.length])

  return messages[index]
}
