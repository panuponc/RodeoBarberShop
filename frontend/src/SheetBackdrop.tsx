import { useEffect, useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import './SheetBackdrop.css'

type Props = {
  children: (close: () => void) => ReactNode
  onClose: () => void
  busy?: boolean
  protectEdits?: boolean
  dismissible?: boolean
  manageFocus?: boolean
}

export function SheetHandle() {
  return <div className="sheet-grab" aria-hidden="true"><span /></div>
}

export function SheetBackdrop({ children, onClose, busy = false, protectEdits = false, dismissible = true, manageFocus = true }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const config = useRef({ onClose, busy, protectEdits, dismissible })
  config.current = { onClose, busy, protectEdits, dismissible }
  const edited = useRef(false)
  const closing = useRef(false)
  const mounted = useRef(false)
  const animations = useRef<Animation[]>([])
  const drag = useRef<{ id: number; start: number; distance: number } | null>(null)
  const panel = () => root.current?.firstElementChild as HTMLElement | null
  const mobile = () => window.matchMedia('(max-width: 639px)').matches
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const canDismiss = () => !config.current.busy && config.current.dismissible && !(config.current.protectEdits && edited.current)

  async function close() {
    const node = panel()
    if (closing.current || config.current.busy || !node || !root.current) return
    closing.current = true
    // Keep the backdrop intercepting taps until the closing sheet has left the screen.
    node.inert = true
    const translate = mobile() ? `translateY(${node.getBoundingClientRect().height + 32}px)` : 'translateY(8px) scale(0.99)'
    const duration = reduced() ? 0 : 240
    const movement = node.animate([
      { transform: getComputedStyle(node).transform, opacity: 1 },
      { transform: translate, opacity: mobile() ? 1 : 0 },
    ], { duration, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' })
    const fade = root.current.animate([{ backgroundColor: 'rgb(0 0 0 / 58%)' }, { backgroundColor: 'rgb(0 0 0 / 0%)' }], { duration, fill: 'forwards' })
    animations.current = [movement, fade]
    try {
      await movement.finished
      if (mounted.current) config.current.onClose()
    } catch { /* Unmount or resize may cancel an in-flight animation. */ }
  }

  function resetDrag() {
    const node = panel()
    if (!node) return
    const from = node.style.transform
    node.style.transform = ''
    if (from && !reduced()) {
      const settle = node.animate([{ transform: from }, { transform: 'translateY(0)' }], {
        duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      })
      animations.current.push(settle)
    }
    drag.current = null
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!mobile() || !canDismiss() || closing.current || event.button !== 0
      || !(event.target as HTMLElement).closest('.sheet-grab')) return
    event.preventDefault()
    animations.current.forEach(animation => animation.cancel())
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, start: event.clientY, distance: 0 }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    const node = panel()
    if (!current || current.id !== event.pointerId || !node) return
    current.distance = Math.max(0, event.clientY - current.start)
    node.style.transform = `translateY(${current.distance}px)`
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (canDismiss() && current.distance > Math.min(120, (panel()?.clientHeight ?? 500) * 0.24)) {
      drag.current = null
      void close()
    } else resetDrag()
  }

  useEffect(() => {
    mounted.current = true
    const previousFocus = document.activeElement as HTMLElement | null
    const node = panel()
    if (manageFocus && node) {
      node.tabIndex = -1
      node.focus({ preventScroll: true })
    }
    function updateViewport() {
      const viewport = window.visualViewport
      root.current?.style.setProperty('--sheet-viewport-height', `${viewport?.height ?? innerHeight}px`)
      root.current?.style.setProperty('--sheet-viewport-top', `${viewport?.offsetTop ?? 0}px`)
      if (drag.current && !closing.current) resetDrag()
    }
    function keyDown(event: KeyboardEvent) {
      if (!manageFocus || closing.current) return
      if (event.key === 'Escape' && canDismiss()) {
        event.preventDefault()
        void close()
      }
      if (event.key !== 'Tab') return
      const focusable = [...(panel()?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? [])]
        .filter(element => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first) { event.preventDefault(); panel()?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel())) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel())) { event.preventDefault(); first.focus() }
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('scroll', updateViewport)
    document.addEventListener('keydown', keyDown)
    return () => {
      mounted.current = false
      animations.current.forEach(animation => animation.cancel())
      window.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('scroll', updateViewport)
      document.removeEventListener('keydown', keyDown)
      if (manageFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
    // The sheet owns one mounted dialog; live callbacks and guards are read through refs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={root} className="modal-backdrop app-sheet-backdrop" role="presentation"
    onChangeCapture={() => { if (protectEdits) edited.current = true }}
    onMouseDown={event => { if (event.target === event.currentTarget && canDismiss()) void close() }}
    onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
    onPointerCancel={resetDrag}>
    {children(() => { void close() })}
  </div>
}
