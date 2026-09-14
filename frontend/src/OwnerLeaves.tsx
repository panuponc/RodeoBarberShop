import { useEffect, useRef, useState } from 'react'
import { ArrowRight, RefreshCw, X } from 'lucide-react'
import { SheetBackdrop, SheetHandle } from './SheetBackdrop'
import './OwnerLeaves.css'

type Leave = { id: string; leaveType: string; startAt: string; endAt: string; reason: string; status: string; reviewNote: string | null; reviewedAt: string | null }
type Item = { leave: Leave; barberId: string; barberName: string; reviewerName: string | null; affectedBookingCount: number }
type Affected = { id: string; bookingNumber: string; customerName: string | null; startAt: string; endAt: string; status: string }
type Props = { api: <T>(path: string, options?: RequestInit) => Promise<T>; onQueue: (date: string) => void }
const statuses: Record<string, string> = { Pending: 'รออนุมัติ', Approved: 'อนุมัติแล้ว', Rejected: 'ไม่อนุมัติ', Cancelled: 'ยกเลิก' }
const types: Record<string, string> = { Sick: 'ลาป่วย', Personal: 'ลากิจ', Vacation: 'ลาพักร้อน', Other: 'อื่น ๆ' }
const dateTime = (value: string) => new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
function period(leave: Leave) {
  const start = new Date(new Date(leave.startAt).getTime() + 7 * 3600000).toISOString()
  const end = new Date(new Date(leave.endAt).getTime() + 7 * 3600000).toISOString()
  if (start.slice(11) === '00:00:00.000Z' && end.slice(11) === '00:00:00.000Z') {
    const day = (value: string) => new Date(value).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' })
    const last = new Date(new Date(leave.endAt).getTime() - 1).toISOString()
    return `${day(leave.startAt)}${day(leave.startAt) !== day(last) ? ` – ${day(last)}` : ''} · เต็มวัน`
  }
  return `${dateTime(leave.startAt)} – ${dateTime(leave.endAt)}`
}

export function OwnerLeaves({ api, onQueue }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState('Pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Item | null>(null)
  const [affected, setAffected] = useState<Affected[] | null>(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null)
  const [busy, setBusy] = useState(false)
  const guard = useRef(false)
  const detailRequest = useRef(0)
  const apiRef = useRef(api)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (mode) noteRef.current?.focus() }, [mode])
  useEffect(() => { apiRef.current = api }, [api])
  useEffect(() => {
    let active = true
    const requests = detailRequest
    apiRef.current<Item[]>('/api/leaves').then(data => { if (active) setItems(data) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'โหลดคำขอไม่สำเร็จ') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; requests.current++ }
  }, [])
  async function refresh() {
    setLoading(true); setError('')
    try { setItems(await api<Item[]>('/api/leaves')) }
    catch (e) { setError(e instanceof Error ? e.message : 'โหลดคำขอไม่สำเร็จ') }
    finally { setLoading(false) }
  }
  async function open(item: Item) {
    const request = ++detailRequest.current
    setSelected(item); setAffected(null); setMode(null); setNote(''); setDetailError(''); setDetailLoading(true)
    try {
      const data = await api<Affected[]>(`/api/leaves/${item.leave.id}/affected-bookings`)
      if (request === detailRequest.current) setAffected(data)
    } catch (e) { if (request === detailRequest.current) setDetailError(e instanceof Error ? e.message : 'โหลดคิวที่กระทบไม่สำเร็จ') }
    finally { if (request === detailRequest.current) setDetailLoading(false) }
  }
  function close() { detailRequest.current++; setSelected(null); setMode(null) }
  async function submit() {
    if (!selected || !mode || affected === null || guard.current) return
    guard.current = true; setBusy(true); setDetailError('')
    try {
      const result = await api<Leave>(`/api/leaves/${selected.leave.id}/${mode}`, { method: 'POST', body: JSON.stringify({ note: note.trim() || null, affectedBookingIds: affected.map(b => b.id) }) })
      setItems(current => current.map(item => item.leave.id === result.id ? { ...item, leave: result } : item))
      setSelected(current => current ? { ...current, leave: result } : null)
      setMode(null); setNotice(mode === 'approve' ? 'อนุมัติแล้ว ระบบกันจองใหม่ในช่วงลา คิวเดิมยังไม่ถูกเปลี่ยน' : 'บันทึกผลไม่อนุมัติแล้ว')
      await refresh()
    } catch (e) {
      setDetailError(`${e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'} กรุณาปิดและรีเฟรชคำขอเพื่อตรวจสอบผลก่อนลองใหม่`)
      setMode(null); setAffected(null)
    } finally { guard.current = false; setBusy(false) }
  }
  const visible = items.filter(item => filter === 'all' || item.leave.status === filter)
  return <section className="owner-leaves bq-workspace" aria-label="จัดการคำขอลา">
    <div className="owner-leave-toolbar"><div className="owner-leave-filters" aria-label="กรองคำขอลา">{[{id:'Pending',label:'รออนุมัติ'},{id:'Approved',label:'อนุมัติแล้ว'},{id:'all',label:'ทั้งหมด'}].map(tab => <button key={tab.id} type="button" aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)}>{tab.label} <span>{items.filter(item => tab.id === 'all' || item.leave.status === tab.id).length}</span></button>)}</div><button className="bq-icon" type="button" title="รีเฟรชคำขอลา" aria-label="รีเฟรชคำขอลา" disabled={loading} onClick={() => void refresh()}><RefreshCw size={18} /></button></div>
    {notice && <p role="status" className="owner-leave-notice">{notice}</p>}
    {error && <p role="alert" className="bq-add-error">{error}</p>}
    {loading ? <p role="status">กำลังโหลดคำขอ</p> : <div className="owner-leave-list">{visible.length === 0 && !error && <p>ไม่มีคำขอในรายการนี้</p>}{visible.map(item => <button className="owner-leave-card" type="button" key={item.leave.id} onClick={() => void open(item)} aria-label={`ดูคำขอลา ${item.barberName}`}>
      <span className="owner-leave-card-heading"><strong>{item.barberName}</strong><span className="bq-badge">{statuses[item.leave.status]}</span></span>
      <span>{types[item.leave.leaveType] || item.leave.leaveType} · {period(item.leave)}</span>
      <span className="owner-leave-impact">{item.affectedBookingCount ? `มีคิวที่กระทบ ${item.affectedBookingCount} คิว` : 'ไม่มีคิวที่กระทบ'}<ArrowRight size={16} /></span>
    </button>)}</div>}
    {selected && <SheetBackdrop onClose={close} busy={busy} protectEdits>{closeSheet => <article className="detail-panel owner-leave-detail" role="dialog" aria-modal="true" aria-labelledby="owner-leave-title">
      <SheetHandle /><header className="booking-detail-header"><div><span className="modal-eyebrow">{types[selected.leave.leaveType] || selected.leave.leaveType} · {statuses[selected.leave.status]}</span><h2 id="owner-leave-title">{selected.barberName}</h2></div><button className="icon-button" type="button" aria-label="ปิดคำขอลา" disabled={busy} onClick={closeSheet}><X size={18} /></button></header>
      <div className="sheet-body owner-leave-body"><p>{period(selected.leave)}</p><p className="owner-leave-reason">{selected.leave.reason}</p>
        {selected.leave.reviewNote && <p>หมายเหตุ: {selected.leave.reviewNote}</p>}
        {selected.leave.reviewedAt && <p className="owner-leave-meta">พิจารณาเมื่อ {dateTime(selected.leave.reviewedAt)}{selected.reviewerName ? ` · ${selected.reviewerName}` : ''}</p>}
        <h3>คิวที่ได้รับผลกระทบ {affected ? `(${affected.length})` : ''}</h3>
        {detailLoading ? <p role="status">กำลังตรวจคิว</p> : affected && (affected.length ? affected.map(booking => <div className="owner-leave-booking" key={booking.id}><strong>{booking.customerName || 'ลูกค้าหน้าร้าน'}</strong><span>{dateTime(booking.startAt)} – {new Date(booking.endAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})}</span><button type="button" className="secondary" disabled={busy} onClick={() => { close(); onQueue(new Date(new Date(booking.startAt).getTime() + 7 * 3600000).toISOString().slice(0,10)) }}>ไปจัดการในตารางคิว<ArrowRight size={16} /></button></div>) : <p>ไม่มีคิวที่กระทบ</p>)}
        {detailError && <p role="alert" className="bq-add-error">{detailError}</p>}
        {!detailLoading && affected === null && <button type="button" className="secondary" disabled={busy} onClick={() => void open(selected)}>โหลดคิวที่กระทบใหม่</button>}
        {mode && <div className="owner-leave-review"><h3>{mode === 'approve' ? 'ยืนยันอนุมัติการลา' : 'เหตุผลที่ไม่อนุมัติ'}</h3>{mode === 'approve' && <p>กันจองใหม่ช่วงนี้ แต่คิวเดิม {affected?.length ?? 0} คิวยังอยู่ ร้านต้องติดต่อและจัดการเอง</p>}<label htmlFor="owner-leave-note">{mode === 'reject' ? 'เหตุผล' : 'หมายเหตุ (ไม่จำเป็น)'}</label><textarea ref={noteRef} id="owner-leave-note" maxLength={1000} rows={3} value={note} disabled={busy} onChange={e => setNote(e.target.value)} /></div>}
      </div>
      <footer className="booking-detail-actions">{selected.leave.status === 'Pending' ? mode ? <><button className="secondary" type="button" disabled={busy} onClick={() => setMode(null)}>กลับ</button><button type="button" disabled={busy || affected === null || (mode === 'reject' && !note.trim())} onClick={() => void submit()}>{busy ? 'กำลังบันทึก' : mode === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันไม่อนุมัติ'}</button></> : <><button className="secondary" type="button" disabled={affected === null || busy} onClick={() => setMode('reject')}>ไม่อนุมัติ</button><button type="button" disabled={affected === null || busy} onClick={() => setMode('approve')}>อนุมัติ</button></> : <button className="secondary" type="button" onClick={closeSheet}>ปิด</button>}</footer>
    </article>}</SheetBackdrop>}
  </section>
}
