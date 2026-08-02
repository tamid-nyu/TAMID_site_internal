import { useCallback, useEffect, useRef, useState } from 'react'

export const ADMIN_IDLE_TIMEOUT_MS = 15 * 60 * 1000
export const ADMIN_IDLE_WARNING_MS = 2 * 60 * 1000

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'keydown',
  'pointerdown',
  'scroll',
  'touchstart',
]

type IdleSignOutOptions = {
  enabled: boolean
  onTimeout: () => void | Promise<void>
  timeoutMs?: number
  warningMs?: number
}

export function useIdleSignOut({
  enabled,
  onTimeout,
  timeoutMs = ADMIN_IDLE_TIMEOUT_MS,
  warningMs = ADMIN_IDLE_WARNING_MS,
}: IdleSignOutOptions) {
  const [showWarning, setShowWarning] = useState(false)
  const lastActivityAt = useRef(0)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current)
    warningTimer.current = null
    timeoutTimer.current = null
  }, [])

  const scheduleTimers = useCallback(
    (elapsedMs = 0) => {
      clearTimers()
      const remainingMs = timeoutMs - elapsedMs

      if (remainingMs <= 0) {
        setShowWarning(false)
        void onTimeoutRef.current()
        return
      }

      const warningDelayMs = remainingMs - warningMs
      if (warningDelayMs <= 0) {
        setShowWarning(true)
      } else {
        setShowWarning(false)
        warningTimer.current = setTimeout(() => setShowWarning(true), warningDelayMs)
      }

      timeoutTimer.current = setTimeout(() => {
        setShowWarning(false)
        void onTimeoutRef.current()
      }, remainingMs)
    },
    [clearTimers, timeoutMs, warningMs]
  )

  const markActive = useCallback(() => {
    if (!enabled) return
    lastActivityAt.current = Date.now()
    scheduleTimers()
  }, [enabled, scheduleTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      return
    }

    lastActivityAt.current = Date.now()
    const initialTimer = setTimeout(scheduleTimers, 0)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleTimers(Date.now() - lastActivityAt.current)
      }
    }

    for (const event of ACTIVITY_EVENTS)
      window.addEventListener(event, markActive, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(initialTimer)
      clearTimers()
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, markActive)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearTimers, enabled, markActive, scheduleTimers])

  return { showWarning, staySignedIn: markActive }
}
