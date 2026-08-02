import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIdleSignOut } from './useIdleSignOut'

describe('useIdleSignOut', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('warns before signing out an inactive admin', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const { result } = renderHook(() =>
      useIdleSignOut({ enabled: true, onTimeout, timeoutMs: 1_000, warningMs: 200 })
    )

    act(() => vi.advanceTimersByTime(800))
    expect(result.current.showWarning).toBe(true)
    expect(onTimeout).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(200))
    expect(onTimeout).toHaveBeenCalledOnce()
    expect(result.current.showWarning).toBe(false)
  })

  it('resets the timeout when the admin is active', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    renderHook(() => useIdleSignOut({ enabled: true, onTimeout, timeoutMs: 1_000, warningMs: 200 }))

    act(() => vi.advanceTimersByTime(700))
    act(() => window.dispatchEvent(new Event('pointerdown')))
    act(() => vi.advanceTimersByTime(700))
    expect(onTimeout).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(300))
    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it('does not schedule sign-out while logged out', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    renderHook(() =>
      useIdleSignOut({ enabled: false, onTimeout, timeoutMs: 1_000, warningMs: 200 })
    )

    act(() => vi.advanceTimersByTime(2_000))
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
