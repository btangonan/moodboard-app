import { useRef, useState, useCallback } from 'react'

export function useUndoHistory<T>(maxHistory = 50) {
  const historyRef = useRef<T[]>([])
  const [canUndo, setCanUndo] = useState(false)

  const push = useCallback((snapshot: T) => {
    historyRef.current = [...historyRef.current.slice(-(maxHistory - 1)), snapshot]
    setCanUndo(true)
  }, [maxHistory])

  const undo = useCallback((): T | null => {
    if (historyRef.current.length === 0) return null
    const snapshot = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    setCanUndo(historyRef.current.length > 0)
    return snapshot
  }, [])

  return { push, undo, canUndo }
}
