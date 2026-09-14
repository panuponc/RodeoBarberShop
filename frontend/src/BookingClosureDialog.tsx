import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { SheetBackdrop, SheetHandle } from './SheetBackdrop'

type Props = {
  date: string
  api: <T>(path: string, options?: RequestInit) => Promise<T>
  barbers: { id: string; fullName: string }[]
  closures: { id: string; barberId: string; endAt: string }[]
  bookings: { id: string; barberId: string | null; customerName: string | null; startAt: string; bookingStatus: string }[]
  onClose: () => void; onSaved: () => void
}
export function BookingClosureDialog({date,api,barbers,closures,bookings,onClose,onSaved}: Props) {
  const [barberId,setBarberId]=useState(barbers[0]?.id ?? '')
  const [reason,setReason]=useState('ช่างไม่มาทำงาน')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [openedAt]=useState(Date.now)
  const guard=useRef(false)
  const closure=closures.find(c=>c.barberId===barberId && Date.parse(c.endAt)>openedAt)
  const affected=bookings.filter(b=>b.barberId===barberId && !['Cancelled','Completed','NoShow'].includes(b.bookingStatus))
  async function submit(event: React.FormEvent) {
    event.preventDefault();if(guard.current)return
    guard.current=true;setBusy(true);setError('')
    try {
      await api(`/api/barbers/${barberId}/booking-closures${closure ? `/${closure.id}/reopen` : ''}`, {method:'POST',body:JSON.stringify({reason:reason.trim(),date})})
      onSaved()
    } catch(e){setError(`${e instanceof Error?e.message:'บันทึกไม่สำเร็จ'} หากสถานะเปลี่ยนแล้ว กรุณาปิดและรีเฟรชตาราง`)}
    finally{guard.current=false;setBusy(false)}
  }
  return <SheetBackdrop onClose={onClose} busy={busy} protectEdits>{close=><form className="detail-panel booking-closure-form" role="dialog" aria-modal="true" aria-labelledby="closure-title" onSubmit={submit}>
    <SheetHandle/><header className="booking-detail-header"><div><span className="modal-eyebrow">{new Date(`${date}T12:00:00+07:00`).toLocaleDateString('th-TH',{dateStyle:'long',timeZone:'Asia/Bangkok'})}</span><h2 id="closure-title">{closure?'เปิดรับจองกลับ':'ปิดรับจองช่าง'}</h2></div><button className="icon-button" type="button" disabled={busy} aria-label="ปิดหน้าจัดการรับจอง" onClick={close}><X size={18}/></button></header>
    <div className="sheet-body booking-closure-body">
      <label>ช่าง<select disabled={busy || barbers.length===1} value={barberId} onChange={e=>{setBarberId(e.target.value);setError('')}}>{barbers.map(b=><option key={b.id} value={b.id}>{b.fullName}</option>)}</select></label>
      {closure?<p>เปิดรับจองกลับตามตารางงาน โดยช่วงลาที่อนุมัติไว้ยังคงปิดรับจอง</p>:<><label>เหตุผล<textarea required maxLength={1000} rows={2} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></label><p>ปิดเฉพาะวันที่ระบุจนสิ้นสุดเวลางาน หากเป็นวันล่วงหน้าจะปิดทั้งช่วงงาน ไม่กระทบวันอื่น และเปิดกลับได้</p></>}
      <h3>คิวเดิมที่ร้านต้องตรวจสอบ ({affected.length})</h3>
      {affected.map(b=><div className="booking-closure-customer" key={b.id}><strong>{b.customerName||'ลูกค้าหน้าร้าน'}</strong><span>{new Date(b.startAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})}</span></div>)}
      <p>คิวเดิมไม่ถูกย้ายหรือยกเลิก ร้านต้องโทรตกลงกับลูกค้าก่อน</p>
    </div><footer className="booking-detail-actions">{error&&<p role="alert" className="bq-add-error">{error}</p>}<button className="secondary" type="button" disabled={busy} onClick={close}>ยกเลิก</button><button type="submit" disabled={busy||!barberId||(!closure&&!reason.trim())}>{busy?'กำลังบันทึก':closure?'ยืนยันเปิดรับจอง':'ยืนยันปิดรับจอง'}</button></footer>
  </form>}</SheetBackdrop>
}
