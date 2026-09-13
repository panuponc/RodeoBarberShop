import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Plus, RefreshCw, X } from 'lucide-react'
import { SheetBackdrop, SheetHandle } from './SheetBackdrop'
import './BarberLeave.css'

type Leave = { id: string; leaveType: string; startAt: string; endAt: string; reason: string; status: string; reviewNote: string | null }
type Props = { api: <T>(path: string, options?: RequestInit) => Promise<T>; onClose: () => void }
const types: Record<string, string> = { Sick: 'ลาป่วย', Personal: 'ลากิจ', Vacation: 'ลาพักร้อน', Other: 'อื่น ๆ' }
const statuses: Record<string, string> = { Pending: 'รออนุมัติ', Approved: 'อนุมัติแล้ว', Rejected: 'ไม่อนุมัติ', Cancelled: 'ยกเลิก' }
const format = (value: string) => new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const shopToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
const nextDate = (date: string) => new Date(new Date(`${date}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)
const dayLabel = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' })
function periodLabel(leave: Leave) {
  const start = new Date(new Date(leave.startAt).getTime() + 7 * 3600000).toISOString()
  const end = new Date(new Date(leave.endAt).getTime() + 7 * 3600000).toISOString()
  if (start.slice(11) === '00:00:00.000Z' && end.slice(11) === '00:00:00.000Z') {
    const last = new Date(new Date(end).getTime() - 86400000).toISOString().slice(0, 10)
    return `${dayLabel(start.slice(0, 10))}${last !== start.slice(0, 10) ? ` – ${dayLabel(last)}` : ''} · เต็มวัน`
  }
  return `${format(leave.startAt)} – ${format(leave.endAt)}`
}

export function BarberLeave({ api, onClose }: Props) {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [leaveType, setLeaveType] = useState('Personal')
  const [start, setStart] = useState(shopToday)
  const [end, setEnd] = useState(shopToday)
  const [allDay, setAllDay] = useState(true)
  const [multipleDays, setMultipleDays] = useState(false)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('18:00')
  const [reason, setReason] = useState('')
  const savingRef = useRef(false)
  const apiRef = useRef(api)
  useEffect(() => { apiRef.current = api }, [api])
  useEffect(() => {
    let active = true
    apiRef.current<Leave[]>('/api/leaves/my').then(result => { if (active) setLeaves(result) }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'โหลดคำขอไม่สำเร็จ') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  async function refresh() {
    setLoading(true); setError('')
    try { setLeaves(await api<Leave[]>('/api/leaves/my')) }
    catch (error) { setError(error instanceof Error ? error.message : 'โหลดคำขอไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (savingRef.current) return
    setError(''); setNotice('')
    const lastDate = multipleDays ? end : start
    if (!start || !lastDate || start < shopToday() || lastDate < start) { setError('กรุณาเลือกวันลาตั้งแต่วันนี้ และวันสุดท้ายไม่ก่อนวันเริ่ม'); return }
    // Full days end at the next midnight (exclusive), in the shop's time zone.
    const startAt = `${start}T${allDay ? '00:00' : startTime}:00+07:00`
    const endAt = `${allDay ? nextDate(lastDate) : lastDate}T${allDay ? '00:00' : endTime}:00+07:00`
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) { setError('เวลาสิ้นสุดต้องหลังเวลาเริ่ม'); return }
    savingRef.current = true; setSaving(true)
    try {
      const leave = await api<Leave>('/api/leaves', { method: 'POST', body: JSON.stringify({ leaveType, startAt, endAt, reason: reason.trim() }) })
      setLeaves(current => [leave, ...current]); setFormOpen(false); setReason(''); setStart(shopToday()); setEnd(shopToday()); setMultipleDays(false); setAllDay(true); setNotice('ส่งคำขอแล้ว รอ Owner อนุมัติ')
    } catch (error) { setError(error instanceof Error ? error.message : 'ส่งไม่สำเร็จ กรุณารีเฟรชรายการเพื่อตรวจสอบก่อนส่งซ้ำ') }
    finally { savingRef.current = false; setSaving(false) }
  }
  return <SheetBackdrop onClose={onClose} busy={saving} protectEdits>{close => <article className="detail-panel bq-leave-panel" role="dialog" aria-modal="true" aria-labelledby="barber-leave-title">
    <SheetHandle />
    <header className="booking-detail-header bq-leave-header">
      {formOpen && <button className="icon-button" type="button" onClick={() => { setFormOpen(false); setError('') }} disabled={saving} aria-label="กลับไปรายการ" title="กลับไปรายการ"><ChevronLeft size={20} /></button>}
      <div className="bq-leave-title"><span className="modal-eyebrow">การลาของฉัน</span><h2 id="barber-leave-title">{formOpen ? 'ขอลา' : 'คำขอลา'}</h2></div>
      {!formOpen && <button className="icon-button" type="button" onClick={() => void refresh()} disabled={loading || saving} aria-label="รีเฟรชคำขอลา" title="รีเฟรชคำขอลา"><RefreshCw size={18} /></button>}
      <button className="icon-button" type="button" onClick={close} disabled={saving} aria-label="ปิดคำขอลา" title="ปิดคำขอลา"><X size={18} /></button>
    </header>
    <div className="sheet-body bq-leave-body">
      {notice && <p role="status" className="bq-leave-notice">{notice}</p>}
      {error && <p role="alert" className="bq-add-error">{error}</p>}
      {formOpen && <form id="barber-leave-form" className="bq-leave-form" onSubmit={submit}>
        <label>ประเภทการลา<select value={leaveType} onChange={event => setLeaveType(event.target.value)} disabled={saving}>{Object.entries(types).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        <fieldset className="bq-leave-mode"><legend>ช่วงลา</legend>{[{value:true,label:'เต็มวัน'},{value:false,label:'ระบุเวลา'}].map(option => <label key={option.label}><input type="radio" name="leave-period" checked={allDay === option.value} onChange={() => setAllDay(option.value)} disabled={saving} /><span>{option.label}</span></label>)}</fieldset>
        <label htmlFor="leave-start">{multipleDays ? 'วันเริ่มลา' : 'วันที่ลา'}</label><input id="leave-start" type="date" required min={shopToday()} value={start} onChange={event => { setStart(event.target.value); if (event.target.value > end) setEnd(event.target.value) }} disabled={saving} />
        <label className="bq-leave-multiple"><input type="checkbox" checked={multipleDays} onChange={event => setMultipleDays(event.target.checked)} disabled={saving} />ลาหลายวัน</label>
        {multipleDays && <label>วันสุดท้ายที่ลา<input type="date" required min={start || shopToday()} value={end} onChange={event => setEnd(event.target.value)} disabled={saving} /></label>}
        {!allDay && <div className="bq-leave-times"><label>ตั้งแต่<input type="time" required value={startTime} onChange={event => setStartTime(event.target.value)} disabled={saving} /></label><label>ถึง<input type="time" required value={endTime} onChange={event => setEndTime(event.target.value)} disabled={saving} /></label></div>}
        <label htmlFor="leave-reason">เหตุผล</label><textarea id="leave-reason" required maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={saving} />
        {start && <p className="bq-leave-summary">{dayLabel(start)}{multipleDays && end && end !== start ? ` – ${dayLabel(end)}` : ''} · {allDay ? 'เต็มวัน' : `${startTime}–${endTime} น. (เวลาไทย)`}</p>}
        <p>คำขอยังไม่ปิดเวลารับจองจนกว่าจะได้รับอนุมัติ</p>
      </form>}
      {!formOpen && <section className="bq-leave-list" aria-label="ประวัติคำขอลา" aria-busy={loading}>
        {loading ? <p role="status">กำลังโหลดคำขอ</p> : leaves.length === 0 ? !error && <p>ยังไม่มีคำขอลา</p> : leaves.map(leave => <article key={leave.id}>
          <div><h3>{types[leave.leaveType] || leave.leaveType}</h3><span className={`bq-badge ${leave.status === 'Approved' ? 'bq-badge-green' : ''}`}>{statuses[leave.status] || leave.status}</span></div>
          <p>{periodLabel(leave)}</p><p className="bq-leave-reason">{leave.reason}</p>
          {leave.reviewNote && <p className="bq-leave-review">หมายเหตุจากผู้อนุมัติ: {leave.reviewNote}</p>}
        </article>)}
      </section>}
    </div>
    <footer className={`booking-detail-actions bq-leave-footer${formOpen ? ' bq-leave-footer-form' : ''}`}>
      {formOpen ? <>
        <button className="secondary" type="button" disabled={saving} onClick={() => { setFormOpen(false); setReason(''); setStart(shopToday()); setEnd(shopToday()); setMultipleDays(false); setAllDay(true); setStartTime('10:00'); setEndTime('18:00'); setError('') }}>ยกเลิก</button>
        <button type="submit" form="barber-leave-form" disabled={saving || !reason.trim()}>{saving ? 'กำลังส่งคำขอ' : 'ส่งคำขอลา'}</button>
      </> : <button type="button" onClick={() => { setFormOpen(true); setError(''); setNotice('') }}><Plus size={18} aria-hidden="true" />ขอลา</button>}
    </footer>
  </article>}</SheetBackdrop>
}
