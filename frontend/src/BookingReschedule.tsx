import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Booking } from './App'
import { SheetBackdrop, SheetHandle } from './SheetBackdrop'
import './BookingReschedule.css'

type Options = {
  updatedAt: string
  barberId: string | null
  startAt: string
  endAt: string
  totalAmount: number
  bookingStatus: string
  barbers: { id: string; fullName: string }[]
  slots: { startAt: string; endAt: string; isAvailable: boolean }[]
}
type Props = {
  booking: Booking
  api: <T>(path: string, options?: RequestInit) => Promise<T>
  onClose: () => void
  onSaved: (date: string) => void
}
const dayOf = (value: string | number) => new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10)
const time = (value: string) => new Date(value).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
const appointment = (value: string) => new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })

export function BookingReschedule({ booking, api, onClose, onSaved }: Props) {
  const [today] = useState(() => dayOf(Date.now()))
  const [date, setDate] = useState(dayOf(booking.startAt) < today ? today : dayOf(booking.startAt))
  const [barberId, setBarberId] = useState(booking.barberId ?? '')
  const [startAt, setStartAt] = useState(booking.startAt)
  const [reason, setReason] = useState('')
  const [loaded, setLoaded] = useState<{ key: string; data: Options } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const version = useRef<string | null>(null)
  const guard = useRef(false)
  const key = `${barberId}/${date}/${retry}`
  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ date })
    if (barberId) params.set('barberId', barberId)
    api<Options>(`/api/bookings/${booking.id}/reschedule?${params}`).then(data => {
      if (cancelled) return
      if (data.barberId !== booking.barberId || Date.parse(data.startAt) !== Date.parse(booking.startAt)
        || Date.parse(data.endAt) !== Date.parse(booking.endAt) || data.totalAmount !== booking.totalAmount
        || data.bookingStatus !== booking.bookingStatus) throw new Error('รายละเอียดคิวเปลี่ยนแล้ว กรุณาปิดหน้าต่างและรีเฟรชคิว')
      if (version.current && version.current !== data.updatedAt) throw new Error('คิวมีการเปลี่ยนแปลง กรุณาปิดหน้าต่างและรีเฟรชคิว')
      version.current = data.updatedAt
      setLoaded({ key, data })
    }).catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดเวลาว่างไม่สำเร็จ') })
    return () => { cancelled = true }
  }, [api, booking, barberId, date, key])
  const ready = loaded?.key === key && !error
  const slot = ready ? loaded.data.slots.find(s => Date.parse(s.startAt) === Date.parse(startAt)) : undefined
  const changed = barberId !== booking.barberId || Date.parse(startAt) !== Date.parse(booking.startAt)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (guard.current || !slot || !changed || !reason.trim() || !version.current) return
    guard.current = true; setBusy(true); setError('')
    try {
      await api(`/api/bookings/${booking.id}/reschedule`, { method: 'PUT', body: JSON.stringify({
        barberId, startAt: slot.startAt, expectedUpdatedAt: version.current, reason: reason.trim(),
      }) })
      onSaved(date)
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ') }
    finally { guard.current = false; setBusy(false) }
  }
  return <SheetBackdrop onClose={onClose} busy={busy} protectEdits>{close =>
    <form className="detail-panel booking-reschedule" role="dialog" aria-modal="true" aria-labelledby="reschedule-title" onSubmit={submit}>
      <SheetHandle />
      <header className="booking-detail-header">
        <div><span className="modal-eyebrow">{booking.customerName || 'ลูกค้าหน้าร้าน'}</span><h2 id="reschedule-title">แก้ไขนัดหมาย</h2></div>
        <button type="button" className="icon-button" aria-label="ปิดการแก้ไขนัดหมาย" disabled={busy} onClick={close}><X size={18} /></button>
      </header>
      <div className="sheet-body reschedule-body">
        <div className="reschedule-original"><span>นัดเดิม</span><strong>{booking.barberName}</strong><span>{appointment(booking.startAt)} - {time(booking.endAt)}</span></div>
        <div className="reschedule-fields">
          <label>ช่าง<select aria-label="ช่าง" value={barberId} disabled={busy || !loaded} onChange={e => { setError(''); setBarberId(e.target.value); setStartAt('') }}>
            <option value="" disabled>เลือกช่าง</option>
            {barberId && !loaded?.data.barbers.some(b => b.id === barberId) && <option value={barberId} disabled>{booking.barberName || 'ช่างเดิม'} (ไม่พร้อมรับจอง)</option>}
            {loaded?.data.barbers.map(b => <option key={b.id} value={b.id}>{b.fullName}</option>)}
          </select></label>
          <label>วันนัด<input type="date" min={today} required value={date} disabled={busy} onChange={e => { setError(''); setDate(e.target.value); setStartAt('') }} /></label>
        </div>
        <fieldset className="reschedule-times" disabled={busy || !ready}><legend>เวลาว่าง</legend>
          {!ready && !error && <p role="status">กำลังตรวจสอบเวลาว่าง...</p>}
          {ready && loaded.data.slots.length === 0 && <p role="status">ไม่มีเวลาว่างสำหรับบริการเดิม เลือกช่างหรือวันอื่น</p>}
          <div>{ready && loaded.data.slots.map(s => <label key={s.startAt}>
            <input type="radio" name="reschedule-time" value={s.startAt} checked={Date.parse(startAt) === Date.parse(s.startAt)} onChange={() => setStartAt(s.startAt)} />
            <span>{time(s.startAt)} - {time(s.endAt)}</span>
          </label>)}</div>
        </fieldset>
        <label>เหตุผล / ข้อตกลงกับลูกค้า<textarea required maxLength={500} rows={2} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label>
        {slot && changed && <div className="reschedule-review"><span>นัดใหม่</span><strong>{loaded?.data.barbers.find(b => b.id === barberId)?.fullName}</strong><span>{appointment(slot.startAt)} - {time(slot.endAt)}</span><small>บริการและยอดชำระเดิม {booking.totalAmount.toLocaleString('th-TH')} บาท</small>{Date.parse(startAt) !== Date.parse(booking.startAt) && <small>เปลี่ยนเวลาแล้ว คิวจะกลับเป็นรอยืนยัน</small>}</div>}
        {error && <div role="alert" className="reschedule-error"><p>{error}</p><button type="button" className="secondary" disabled={busy} onClick={() => { setError(''); setRetry(n => n + 1) }}>ตรวจสอบอีกครั้ง</button></div>}
      </div>
      <footer className="booking-detail-actions"><button type="submit" disabled={busy || !slot || !changed || !reason.trim()}>{busy ? 'กำลังบันทึก...' : 'ยืนยันแก้ไขนัดหมาย'}</button></footer>
    </form>
  }</SheetBackdrop>
}
