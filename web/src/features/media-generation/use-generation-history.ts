import { useCallback, useState } from 'react'

export function useGenerationHistory<T extends { id: string }>() {
  const [entries, setEntries] = useState<T[]>([])
  const [selectedId, select] = useState('')
  const add = useCallback((entry: T) => {
    setEntries((previous) =>
      [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, 12)
    )
    select(entry.id)
  }, [])
  return {
    entries,
    selected: entries.find((entry) => entry.id === selectedId),
    select,
    add,
  }
}
