import { useRef, useState } from 'react'
import type { Booking } from './App'

type Service = { id: string; name: string; price: number; durationMinutes: number }
type Props = {
  booking: Booking
  api: <T>(path: string, options?: RequestInit) => Promise<T>
  busy: boolean
  onBusy: (busy: boolean) => void
  onSaved: (booking: Booking) => void
}
const money = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(value)
const time = (value: string | number) => new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

export function BarberAddServices({ booking, api, busy, onBusy, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const saving = useRef(false)
  const chosen = services.filter(service => selected.includes(service.id))
  const addedAmount = chosen.reduce((sum, service) => sum + service.price, 0)
  const addedMinutes = chosen.reduce((sum, service) => sum + service.durationMinutes, 0)

  async function load() {
    setOpen(true)
    setLoading(true)
    setError('')
    setSelected([])
    try {
      const result = await api<Service[]>('/api/services')
      setServices(result.filter(service => !booking.services.some(existing => existing.serviceId === service.id)))
    } catch (error) {
      setServices([])
      setError(error instanceof Error ? error.message : 'โหลดบริการไม่สำเร็จ')
    } finally { setLoading(false) }
  }

  async function save() {
    if (saving.current || busy || !chosen.length) return
    saving.current = true
    onBusy(true)
    setError('')
    try {
      const updated = await api<Booking>(`/api/queue/${booking.id}/services`, {
        method: 'POST',
        body: JSON.stringify({ serviceIds: selected, expectedEndAt: booking.endAt, expectedTotalAmount: booking.totalAmount, expectedAddedAmount: addedAmount, expectedAddedMinutes: addedMinutes }),
      })
      onSaved(updated)
      setOpen(false)
      setSelected([])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ กรุณารีเฟรชเพื่อตรวจสอบก่อนลองใหม่')
    } finally { saving.current = false; onBusy(false) }
  }

  if (!open) return <button className="bq-add-services-toggle" type="button" disabled={busy} onClick={() => void load()}>+ เพิ่มบริการระหว่างทำ</button>
  return <section className="bq-add-services" aria-label="เพิ่มบริการระหว่างทำ">
    <h3>เพิ่มบริการระหว่างทำ</h3>
    {loading ? <p role="status">กำลังโหลดบริการ</p> : <>
      {services.length > 0 && <div className="bq-add-options">{services.map(service => <label key={service.id}>
        <input type="checkbox" checked={selected.includes(service.id)} disabled={busy} onChange={event => setSelected(current => event.target.checked ? [...current, service.id] : current.filter(id => id !== service.id))} />
        <span><strong>{service.name}</strong><small>{money(service.price)} · เพิ่ม {service.durationMinutes} นาที</small></span>
      </label>)}</div>}
      {!services.length && !error && <p>ไม่มีบริการเพิ่มเติม</p>}
      {chosen.length > 0 && <dl className="bq-add-preview">
        <div><dt>เพิ่มค่าบริการ</dt><dd>+{money(addedAmount)}</dd></div>
        <div><dt>ยอดรวมใหม่</dt><dd>{money(booking.totalAmount + addedAmount)}</dd></div>
        <div><dt>เวลาจบใหม่ (+{addedMinutes} นาที)</dt><dd>{time(booking.endAt)} → {time(new Date(booking.endAt).getTime() + addedMinutes * 60000)}</dd></div>
      </dl>}
    </>}
    {error && <p className="bq-add-error" role="alert">{error}</p>}
    <div className="bq-add-actions">
      <button type="button" disabled={busy} onClick={() => { setOpen(false); setError('') }}>ยกเลิก</button>
      <button type="button" disabled={busy || loading || !chosen.length} onClick={() => void save()}>{busy ? 'กำลังบันทึก' : 'ยืนยันเพิ่มบริการ'}</button>
    </div>
  </section>
}
