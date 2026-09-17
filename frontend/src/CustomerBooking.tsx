import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, LogOut, RefreshCw, Scissors } from 'lucide-react'
import type { Barber, Booking, Receipt } from './App'
import { CustomerBookingCancellation } from './CustomerBookingCancellation'
import './CustomerBooking.css'

type Service = { id: string; name: string; description: string | null; price: number; durationMinutes: number }
type Slot = { startAt: string; endAt: string; isAvailable: boolean }
type Props = { token: string; fullName: string; onLogout: () => void; statusLabels: Record<string, string>; renderReceipt: (receipt: Receipt) => ReactNode }
const money = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
const dateText = (value: string) => new Date(value).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' })
const time = (value: string) => new Date(value).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
const localDay = (value = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
const closed = new Set(['Completed', 'Cancelled', 'NoShow'])
const errorText = (error: unknown) => error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง'

export function CustomerBooking({ token, fullName, onLogout, statusLabels, renderReceipt }: Props) {
  const [view, setView] = useState<'book' | 'appointments'>('book')
  const [step, setStep] = useState(0)
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [barberId, setBarberId] = useState('')
  const [day, setDay] = useState(localDay)
  const [now, setNow] = useState(Date.now)
  const [retry, setRetry] = useState(0)
  const [slots, setSlots] = useState<{ key: string; items: Slot[]; error: string } | null>(null)
  const [choice, setChoice] = useState<{ key: string; slot: Slot } | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState<Booking | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyNotice, setHistoryNotice] = useState('')
  const [receipt, setReceipt] = useState<{ id: string; data: Receipt } | null>(null)
  const [receiptLoading, setReceiptLoading] = useState('')
  const submitting = useRef(false)
  const receiptRequest = useRef(0)
  const historyRequest = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const selected = services.filter(service => ids.includes(service.id))
  const matchingServices = services.filter(service => service.name.toLocaleLowerCase('th-TH').includes(search.trim().toLocaleLowerCase('th-TH')))
  const total = selected.reduce((sum, service) => sum + service.price, 0)
  const minutes = selected.reduce((sum, service) => sum + service.durationMinutes, 0)
  const barber = barbers.find(item => item.id === barberId)
  const key = JSON.stringify([barberId, day, [...ids].sort(), retry])
  const currentSlots = slots?.key === key ? slots : null
  const selectedSlot = choice?.key === key && Date.parse(choice.slot.startAt) > now
    && currentSlots?.items.some(slot => slot.isAvailable && slot.startAt === choice.slot.startAt) ? choice.slot : null
  const upcoming = bookings.filter(booking => !closed.has(booking.bookingStatus)).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  const history = bookings.filter(booking => closed.has(booking.bookingStatus)).sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt))

  const request = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.message ?? (response.status === 401 ? 'กรุณาเข้าสู่ระบบใหม่' : 'เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง'))
    }
    return response.json() as Promise<T>
  }, [token])

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [serviceData, barberData, bookingData] = await Promise.all([
        request<Service[]>('/api/services', { signal }), request<Barber[]>('/api/barbers', { signal }), request<Booking[]>('/api/bookings/my', { signal }),
      ])
      if (signal?.aborted) return
      setServices(serviceData); setBarbers(barberData); setBookings(bookingData)
    } catch (error) {
      if (!signal?.aborted) setLoadError(errorText(error))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [request])

  // Load the authenticated customer's data; abort results from an unmounted session.
  // oxlint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { heading.current?.focus() }, [step, view, success])
  useEffect(() => {
    if (!barberId || !ids.length || day < localDay() || step === 0 || view !== 'book') return
    const controller = new AbortController()
    const params = new URLSearchParams({ barberId, date: day })
    ids.forEach(id => params.append('serviceIds', id))
    request<Slot[]>(`/api/bookings/availability?${params}`, { signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) setSlots({ key, items, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setSlots({ key, items: [], error: errorText(error) })
    })
    return () => controller.abort()
  }, [barberId, day, ids, key, request, step, view])

  function edit() { setChoice(null); setSubmitError(''); setSuccess(null) }
  function navigate(target: 'book' | 'appointments') {
    setView(target)
    receiptRequest.current++
    setReceiptLoading('')
    setReceipt(null)
    if (target === 'book') { setRetry(value => value + 1); setChoice(null); if (step === 2) setStep(1) }
  }
  async function refreshHistory() {
    const sequence = ++historyRequest.current
    setHistoryLoading(true); setHistoryError('')
    try {
      const items = await request<Booking[]>('/api/bookings/my')
      if (sequence === historyRequest.current) setBookings(items)
    } catch (error) { if (sequence === historyRequest.current) setHistoryError(errorText(error)) }
    finally { if (sequence === historyRequest.current) setHistoryLoading(false) }
  }
  async function confirmBooking() {
    if (submitting.current || !selectedSlot || Date.parse(selectedSlot.startAt) <= Date.now()) return
    submitting.current = true; setBusy(true); setSubmitError('')
    try {
      const created = await request<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify({ barberId, startAt: selectedSlot.startAt, serviceIds: ids }) })
      historyRequest.current++; setHistoryLoading(false)
      setBookings(items => [created, ...items.filter(item => item.id !== created.id)])
      setSuccess(created); setChoice(null); setSlots(null); setIds([]); setStep(0)
    } catch (error) {
      setSubmitError(errorText(error)); setChoice(null); setRetry(value => value + 1); setStep(1)
    } finally { submitting.current = false; setBusy(false) }
  }
  async function showReceipt(booking: Booking) {
    const sequence = ++receiptRequest.current
    setReceipt(null); setReceiptLoading(booking.id); setHistoryError('')
    try {
      const data = await request<Receipt>(`/api/payments/booking/${booking.id}/receipt`)
      if (sequence === receiptRequest.current) setReceipt({ id: booking.id, data })
    } catch (error) { if (sequence === receiptRequest.current) setHistoryError(errorText(error)) }
    finally { if (sequence === receiptRequest.current) setReceiptLoading('') }
  }

  const visibleSlots = currentSlots?.items.filter(slot => slot.isAvailable && Date.parse(slot.startAt) > now) ?? []
  const canAdvance = step === 0 ? ids.length > 0 : !!selectedSlot
  const nextLabel = step === 0 ? 'เลือกช่างและเวลา' : step === 1 ? 'ตรวจสอบการจอง' : 'ยืนยันการจอง'
  const summary = <>
    <div className="cb-summary-title"><Scissors size={18} /><h2>สรุปการจอง</h2></div>
    {selected.length ? <ul>{selected.map(service => <li key={service.id}><span>{service.name}</span><strong>{money(service.price)}</strong></li>)}</ul> : <p className="cb-muted">ยังไม่ได้เลือกบริการ</p>}
    <dl><div><dt>ระยะเวลา</dt><dd>{minutes} นาที</dd></div>{barber && <div><dt>ช่าง</dt><dd>{barber.fullName}</dd></div>}{selectedSlot && <div><dt>วันและเวลา</dt><dd>{dateText(selectedSlot.startAt)}<br />{time(selectedSlot.startAt)} – {time(selectedSlot.endAt)}</dd></div>}</dl>
    <div className="cb-total"><span>ยอดรวมโดยประมาณ</span><strong>{money(total)}</strong></div>
  </>

  return <main className="customer-booking">
    <header className="cb-header"><div className="cb-header-inner"><div className="cb-brand"><strong>RODEO</strong><span>BARBER SHOP</span></div><div className="cb-account"><span>{fullName}</span><button className="cb-icon" title="ออกจากระบบ" aria-label="ออกจากระบบ" onClick={onLogout} disabled={busy}><LogOut size={19} /></button></div></div></header>
    <nav className="cb-navigation" aria-label="เมนูลูกค้า"><div>{(['book', 'appointments'] as const).map(target => <button key={target} disabled={busy} aria-current={view === target ? 'page' : undefined} className={view === target ? 'active' : ''} onClick={() => navigate(target)}>{target === 'book' ? <Scissors size={19} /> : <CalendarDays size={19} />}<span>{target === 'book' ? 'จองคิว' : 'นัดหมายของฉัน'}</span>{target === 'appointments' && upcoming.length > 0 && <small>{upcoming.length}</small>}</button>)}</div></nav>
    <div className="cb-content">
      {loading ? <div className="cb-empty" role="status">กำลังโหลดข้อมูลร้าน...</div> : loadError ? <div className="cb-empty"><p role="alert">{loadError}</p><button onClick={() => { setLoading(true); setLoadError(''); void load() }}><RefreshCw size={17} />ลองอีกครั้ง</button></div> : view === 'book' ? <>
        {success ? <section className="cb-success"><CheckCircle2 size={40} /><p className="cb-eyebrow">นัดหมายของคุณ</p><h1 ref={heading} tabIndex={-1}>จองคิวเรียบร้อย</h1><p>{success.barberName ?? barber?.fullName}</p><strong>{dateText(success.startAt)} · {time(success.startAt)} – {time(success.endAt)}</strong><p className="cb-muted">เลขการจอง {success.bookingNumber}</p><button className="cb-primary" onClick={() => { setHistoryFilter('upcoming'); navigate('appointments') }}>ดูนัดหมายของฉัน<ArrowRight size={18} /></button><button onClick={() => { setSuccess(null); setStep(0) }}>จองเพิ่ม</button></section> : <>
          <div className="cb-page-heading"><p className="cb-eyebrow">YOUR NEXT VISIT</p><h1 ref={heading} tabIndex={-1}>จองเวลาของคุณ</h1></div>
          <ol className="cb-steps" aria-label="ขั้นตอนการจอง">{['บริการ', 'ช่างและเวลา', 'ยืนยัน'].map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''}><button disabled={busy || index > step} onClick={() => { setStep(index); setSubmitError('') }} aria-current={index === step ? 'step' : undefined}><span>{index < step ? <Check size={15} /> : index + 1}</span>{label}</button></li>)}</ol>
          <div className="cb-layout"><section className="cb-form">
            {submitError && <p className="cb-error" role="alert">{submitError}</p>}
            {step === 0 && <><div className="cb-section-heading"><h2>เลือกบริการ</h2><span className="cb-muted">เลือกได้มากกว่า 1 รายการ</span></div>{services.length > 8 && <input className="cb-search" type="search" aria-label="ค้นหาบริการ" placeholder="ค้นหาบริการ" value={search} onChange={event => setSearch(event.target.value)} />}{services.length > 0 && !matchingServices.length && <p className="cb-empty">ไม่พบบริการที่ค้นหา</p>}{!services.length ? <div className="cb-empty">ยังไม่มีบริการเปิดให้จอง</div> : <div className="cb-services">{matchingServices.map(service => <label key={service.id} className={`cb-service${ids.includes(service.id) ? ' selected' : ''}`}><input type="checkbox" checked={ids.includes(service.id)} onChange={event => { edit(); setIds(current => event.target.checked ? [...current, service.id] : current.filter(id => id !== service.id)) }} /><span className="cb-service-info"><strong>{service.name}</strong>{service.description && <small>{service.description}</small>}<span className="cb-muted"><Clock3 size={13} />{service.durationMinutes} นาที</span></span><strong className="cb-price">{money(service.price)}</strong></label>)}</div>}</>}
            {step === 1 && <>
              <div className="cb-section-heading"><h2>เลือกช่าง</h2></div>
              {!barbers.length && <p className="cb-empty">ยังไม่มีช่างเปิดให้จอง</p>}
              <div className="cb-barbers" role="radiogroup" aria-label="เลือกช่าง">{barbers.map(item => <label className={barberId === item.id ? 'selected' : ''} key={item.id}><input type="radio" name="barber" checked={barberId === item.id} onChange={() => { edit(); setBarberId(item.id) }} /><span className="cb-avatar" aria-hidden="true">{(item.nickname || item.fullName).slice(0, 1)}</span><span><strong>{item.fullName}</strong>{item.specialty && <small>{item.specialty}</small>}</span></label>)}</div>
              <div className="cb-section-heading cb-date-heading"><h2>วันนัดหมาย</h2><input aria-label="วันนัดหมาย" type="date" min={localDay(now)} value={day} onChange={event => { edit(); setDay(event.target.value) }} /></div>
              <div className="cb-days">{Array.from({ length: 7 }, (_, index) => { const value = localDay(now + index * 86400000); return <button key={value} aria-pressed={day === value} className={day === value ? 'selected' : ''} onClick={() => { edit(); setDay(value) }}><span>{index === 0 ? 'วันนี้' : new Date(`${value}T12:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'short' })}</span><strong>{Number(value.slice(-2))}</strong></button> })}</div>
              <div className="cb-section-heading"><h2>เวลาที่ว่าง</h2><span className="cb-muted">ใช้เวลา {minutes} นาที</span></div>
              {!barberId ? <p className="cb-empty">เลือกช่างเพื่อดูเวลาว่าง</p> : day < localDay(now) ? <p className="cb-error">กรุณาเลือกวันนี้หรือวันถัดไป</p> : !currentSlots ? <p className="cb-empty" role="status">กำลังตรวจสอบเวลาว่าง...</p> : currentSlots.error ? <div className="cb-empty"><p role="alert">{currentSlots.error}</p><button onClick={() => setRetry(value => value + 1)}><RefreshCw size={17} />ลองอีกครั้ง</button></div> : !visibleSlots.length ? <div className="cb-empty"><CalendarDays size={25} /><strong>ไม่มีเวลาว่างสำหรับบริการที่เลือก</strong><span>ลองเลือกวันอื่นหรือเปลี่ยนช่าง</span></div> : <div className="cb-slots" role="radiogroup" aria-label="เวลาที่ว่าง">{visibleSlots.map(slot => <label className={selectedSlot?.startAt === slot.startAt ? 'selected' : ''} key={slot.startAt}><input type="radio" name="slot" checked={selectedSlot?.startAt === slot.startAt} onChange={() => { setChoice({ key, slot }); setSubmitError('') }} /><span>{time(slot.startAt)}</span></label>)}</div>}
            </>}
            {step === 2 && <><div className="cb-section-heading"><h2>ตรวจสอบก่อนยืนยัน</h2><button className="cb-text" disabled={busy} onClick={() => setStep(1)}>แก้ไขวันและเวลา</button></div><div className="cb-review-date"><CalendarDays size={28} /><div><strong>{selectedSlot ? dateText(selectedSlot.startAt) : 'กรุณาเลือกเวลาใหม่'}</strong><p>{selectedSlot && `${time(selectedSlot.startAt)} – ${time(selectedSlot.endAt)}`}</p></div></div><dl className="cb-review-details"><div><dt>ลูกค้า</dt><dd>{fullName}</dd></div><div><dt>ช่าง</dt><dd>{barber?.fullName}</dd></div></dl><div className="cb-review-services">{summary}</div><p className="cb-muted cb-policy">ยกเลิกออนไลน์ได้ก่อนนัดอย่างน้อย 1 ชั่วโมง หลังจากนั้นกรุณาติดต่อร้าน</p>{!selectedSlot && <p role="alert" className="cb-error">เวลาที่เลือกหมดอายุแล้ว กรุณากลับไปเลือกเวลาใหม่</p>}</>}
          </section><aside className="cb-summary">{summary}</aside></div>
          <footer className="cb-action-bar"><div><div className="cb-action-total"><small>{ids.length} บริการ · {minutes} นาที</small><strong>{money(total)}</strong></div>{step > 0 && <button className="cb-back" aria-label="ย้อนกลับ" title="ย้อนกลับ" disabled={busy} onClick={() => setStep(value => value - 1)}><ArrowLeft size={20} /></button>}<button className="cb-primary" disabled={busy || !canAdvance} onClick={() => step === 2 ? void confirmBooking() : setStep(value => value + 1)}>{busy ? 'กำลังจอง...' : nextLabel}{!busy && <ArrowRight size={18} />}</button></div></footer>
        </>}
      </> : <>
        <div className="cb-page-heading cb-history-heading"><div><p className="cb-eyebrow">MY APPOINTMENTS</p><h1 ref={heading} tabIndex={-1}>นัดหมายของฉัน</h1></div><button className="cb-icon" title="รีเฟรชนัดหมาย" aria-label="รีเฟรชนัดหมาย" disabled={historyLoading} onClick={() => void refreshHistory()}><RefreshCw size={19} /></button></div>
        <div className="cb-filters" role="group" aria-label="รายการนัดหมาย"><button aria-pressed={historyFilter === 'upcoming'} onClick={() => setHistoryFilter('upcoming')}>นัดหมายปัจจุบัน <span>{upcoming.length}</span></button><button aria-pressed={historyFilter === 'past'} onClick={() => setHistoryFilter('past')}>ประวัติ <span>{history.length}</span></button></div>
        {historyError && <p className="cb-error" role="alert">{historyError}</p>}
        {historyNotice && <p className="cb-history-notice" role="status">{historyNotice}</p>}
        {historyLoading && <p role="status" className="cb-muted">กำลังอัปเดตนัดหมาย...</p>}
        <div className="cb-appointments">{(historyFilter === 'upcoming' ? upcoming : history).length === 0 ? <div className="cb-empty"><CalendarDays size={32} /><h2>{historyFilter === 'upcoming' ? 'ยังไม่มีนัดหมาย' : 'ยังไม่มีประวัติ'}</h2>{historyFilter === 'upcoming' && <button className="cb-primary" onClick={() => { setSuccess(null); navigate('book') }}>จองคิวใหม่<ArrowRight size={18} /></button>}</div> : (historyFilter === 'upcoming' ? upcoming : history).map(booking => <article className="cb-appointment" key={booking.id}>
          <div className="cb-appointment-top"><span><CalendarDays size={16} />{dateText(booking.startAt)}</span><span className={`cb-status cb-status-${booking.bookingStatus}`}>{statusLabels[booking.bookingStatus] ?? booking.bookingStatus}</span></div>
          <h2>{time(booking.startAt)} – {time(booking.endAt)}</h2><p className="cb-barber-name">{booking.barberName ?? 'ยังไม่ระบุช่าง'}</p>
          <ul className="cb-booked-services">{booking.services.map((service, index) => <li key={`${service.serviceId}-${index}`}><span>{service.serviceName}{service.quantity > 1 ? ` × ${service.quantity}` : ''}</span><span>{service.durationMinutes * service.quantity} นาที</span></li>)}</ul>
          <div className="cb-booking-meta"><small>{booking.bookingNumber}</small><strong>{money(booking.totalAmount)}</strong></div>
          {booking.bookingStatus === 'Cancelled' && booking.cancelReason && <p className="cb-muted">เหตุผล: {booking.cancelReason}</p>}
          <CustomerBookingCancellation startAt={booking.startAt} status={booking.bookingStatus} onCancel={async reason => {
            const updated = await request<Booking>(`/api/bookings/${booking.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
            historyRequest.current++; setHistoryLoading(false); setHistoryError(''); setHistoryNotice('ยกเลิกแล้ว ดูรายการได้ในประวัติ'); heading.current?.focus()
            setBookings(items => items.map(item => item.id === updated.id ? updated : item)); setChoice(null); setRetry(value => value + 1); setSuccess(null); setHistoryFilter('past')
          }} />
          {booking.bookingStatus === 'Completed' && <button disabled={receiptLoading !== ''} onClick={() => receipt?.id === booking.id ? setReceipt(null) : void showReceipt(booking)}>{receiptLoading === booking.id ? 'กำลังโหลด...' : receipt?.id === booking.id ? 'ซ่อนใบเสร็จ' : 'ดูใบเสร็จ'}</button>}
          {receipt?.id === booking.id && renderReceipt(receipt.data)}
        </article>)}</div>
      </>}
    </div>
  </main>
}
