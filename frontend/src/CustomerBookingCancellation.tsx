import { useEffect, useRef, useState } from 'react'
import './CustomerBookingCancellation.css'

type Props = {
  startAt: string
  status: string
  onCancel: (reason: string) => Promise<void>
}

export function CustomerBookingCancellation({ startAt, status, onCancel }: Props) {
  const [now, setNow] = useState(Date.now)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (status !== 'PendingConfirmation') return null
  const eligible = Date.parse(startAt) - now >= 3600000

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current || !reason.trim()) return
    if (Date.parse(startAt) - Date.now() < 3600000) {
      setNow(Date.now())
      return
    }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      await onCancel(reason.trim())
      setOpen(false)
      setReason('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ยกเลิกไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <div className="customer-cancellation">
      {!eligible ? <p className="muted">เหลือไม่ถึง 1 ชั่วโมงหรือเลยเวลานัดแล้ว กรุณาติดต่อร้านเพื่อยกเลิก</p>
        : !open ? <button className="danger" type="button" onClick={() => setOpen(true)}>ยกเลิกการจอง</button>
          : <form onSubmit={submit}>
            <label>เหตุผลการยกเลิก
              <textarea autoFocus required disabled={busy} value={reason} onChange={event => setReason(event.target.value)} rows={2} />
            </label>
            <p className="muted">เมื่อยืนยันแล้ว เวลานี้จะเปิดให้ผู้อื่นจอง</p>
            <div className="customer-cancellation-actions">
              <button className="secondary" disabled={busy} onClick={() => { setOpen(false); setError('') }} type="button">กลับ</button>
              <button className="danger solid" disabled={busy || !reason.trim()} type="submit">{busy ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}</button>
            </div>
          </form>}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
