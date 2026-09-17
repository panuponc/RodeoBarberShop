import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock3, History, ListOrdered, LogOut, Play, QrCode, ReceiptText, RefreshCw, Scissors, UserRound } from 'lucide-react'
import type { Barber, Booking } from './App'
import '@fontsource/prompt/thai-400.css'
import '@fontsource/prompt/thai-500.css'
import '@fontsource/prompt/thai-600.css'
import '@fontsource/prompt/latin-400.css'
import '@fontsource/prompt/latin-500.css'
import '@fontsource/prompt/latin-600.css'
import '@fontsource/outfit/latin-600.css'
import './BarberQueue.css'
import { BookingWorkSummary } from './BookingWorkSummary'
import { CustomerPhoneLink } from './CustomerPhoneLink'

type Props = {
  fullName: string
  profile: Barber | null
  bookings: Booking[]
  date: string
  onDateChange: (date: string) => void
  onSelect: (booking: Booking) => void
  onAdvance: (booking: Booking) => void
  onCheckout: (booking: Booking) => void
  onRefresh: () => void
  onProfile: () => void
  onLeave: () => void
  onLogout: () => void
  isBusy: boolean
  isLoading: boolean
  error: string
  statusLabels: Record<string, string>
}

const time = (value: string) => new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
const money = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const actionLabels: Record<string, string> = {
  PendingConfirmation: 'ลูกค้ามาถึงแล้ว',
  Confirmed: 'เริ่มให้บริการ',
  WaitingService: 'เริ่มให้บริการ',
  InService: 'เสร็จแล้ว / รอชำระ',
}
const closedStatuses = new Set(['Completed', 'Cancelled', 'NoShow'])

export function BarberQueue({ fullName, profile, bookings, date, onDateChange, onSelect, onAdvance, onCheckout, onRefresh, onProfile, onLeave, onLogout, isBusy, isLoading, error, statusLabels }: Props) {
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'queue' | 'history'>('queue')
  const sorted = [...bookings].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const active = sorted.filter((booking) => !closedStatuses.has(booking.bookingStatus))
  const history = sorted.filter((booking) => closedStatuses.has(booking.bookingStatus))
  const completed = history.filter((booking) => booking.bookingStatus === 'Completed')
  const inService = active.find((booking) => booking.bookingStatus === 'InService')
  const upcoming = active.find((booking) => ['PendingConfirmation', 'Confirmed', 'WaitingService'].includes(booking.bookingStatus))
  const working = active.filter((booking) => ['InService', 'WaitingPayment'].includes(booking.bookingStatus))
  const waiting = active.filter((booking) => !working.includes(booking))
  const visible = view === 'history' ? history : filter === 'working' ? working : filter === 'waiting' ? waiting : active
  const showCurrent = date === localDate(new Date())
  const displayName = profile?.fullName || fullName
  const avatarName = (profile?.nickname || displayName).replace(/^ช่าง\s*/, '')

  function changeDate(offset: number) {
    const target = new Date(`${date}T12:00:00`)
    target.setDate(target.getDate() + offset)
    onDateChange(localDate(target))
  }

  function renderBooking(booking: Booking) {
    const highlighted = view === 'queue' && booking.id === (inService ?? upcoming)?.id
    const action = actionLabels[booking.bookingStatus]
    const canCheckout = booking.bookingStatus === 'WaitingPayment'
    const hasReceipt = booking.paymentStatus === 'Paid'
    const duration = Math.round((new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 60000)
    return (
      <article className={`bq-booking${highlighted ? ' bq-booking-featured' : ''}`} key={booking.id}>
        <div className="bq-booking-top">
          <span className="bq-booking-number" title={`เลขจอง ${booking.bookingNumber}`} aria-label={`ลำดับ ${sorted.indexOf(booking) + 1}, เลขจอง ${booking.bookingNumber}`}>#Q-{String(sorted.indexOf(booking) + 1).padStart(2, '0')}</span>
          <span className={`bq-badge ${booking.bookingStatus === 'InService' || booking.bookingStatus === 'Completed' ? 'bq-badge-green' : ''}`}>{statusLabels[booking.bookingStatus] || booking.bookingStatus}</span>
        </div>
        <div className="bq-booking-time"><Clock3 size={14} /><time dateTime={booking.startAt}>{time(booking.startAt)} - {time(booking.endAt)}</time>{highlighted && <span>{inService ? 'กำลังให้บริการ' : 'คิวถัดไป'}</span>}</div>
        <div className="bq-customer-heading"><h3>{booking.customerName || 'ลูกค้าหน้าร้าน'}</h3>{!closedStatuses.has(booking.bookingStatus) && <CustomerPhoneLink booking={booking} />}</div>
        {booking.services.some(service => service.addedDuringService) ? <BookingWorkSummary booking={booking} /> : <p className="bq-services">{booking.services.map((service) => `${service.serviceName}${service.quantity > 1 ? ` × ${service.quantity}` : ''}`).join(' + ') || 'ไม่ระบุบริการ'} <span>({duration} นาที)</span></p>}
        <div className="bq-booking-price"><strong>{money(booking.totalAmount)}</strong>{booking.paymentStatus === 'Paid' && <span className="bq-paid"><CircleCheck size={13} /> ชำระแล้ว</span>}</div>
        <div className={`bq-card-actions${action || canCheckout || hasReceipt ? '' : ' bq-card-actions-single'}`}>
          {(canCheckout || hasReceipt) && <button className={canCheckout ? 'bq-primary' : 'bq-confirm'} disabled={isBusy || isLoading} onClick={() => onCheckout(booking)} type="button">{canCheckout ? <QrCode size={16} /> : <ReceiptText size={16} />}{canCheckout ? 'รับชำระเงิน' : 'ดูใบเสร็จ'}</button>}
          {action && <button className={highlighted ? 'bq-primary' : 'bq-confirm'} disabled={isBusy || isLoading || !!error} onClick={() => onAdvance(booking)} type="button">{booking.bookingStatus === 'PendingConfirmation' ? <Check size={16} /> : <Play size={15} />}{action}</button>}
          <button className="bq-detail" onClick={() => onSelect(booking)} type="button" aria-label={`ดูรายละเอียดคิว ${booking.bookingNumber}`}>รายละเอียด<ArrowRight size={15} /></button>
        </div>
      </article>
    )
  }

  return (
    <>
      <header className="bq-header">
        <div className="bq-header-inner">
          <div><p className="bq-brand"><i /> RODEO BARBER</p><h1>Today Queue</h1></div>
          <div className="bq-header-actions">
            <button className="bq-icon" title="รีเฟรชคิว" aria-label="รีเฟรชคิว" onClick={onRefresh} disabled={isLoading || isBusy} type="button"><RefreshCw size={18} className={isLoading ? 'bq-spinning' : ''} /></button>
            <button className="bq-icon bq-profile-icon" title="โปรไฟล์" aria-label="โปรไฟล์" onClick={onProfile} type="button"><UserRound size={18} /></button>
            <button className="bq-icon" title="ออกจากระบบ" aria-label="ออกจากระบบ" onClick={onLogout} type="button"><LogOut size={17} /></button>
          </div>
        </div>
      </header>

      <div className="bq-layout">
        <div className="bq-overview">
          <section className="bq-profile" aria-label="ข้อมูลช่าง">
            <div className="bq-identity">
              <span className="bq-avatar" aria-hidden="true">{Array.from(avatarName)[0] || 'R'}<i className={profile?.isAvailable ? 'bq-online' : ''} /></span>
              <div><h2>{displayName}</h2><p className="bq-specialty">{profile?.specialty || 'ช่างประจำร้าน'}</p><p className="bq-profile-state"><CircleCheck size={13} />{profile ? `${profile.isAvailable ? 'พร้อมรับงาน' : 'พักงานวันนี้'} · ${profile.acceptsBooking ? 'รับจองออนไลน์' : 'ปิดรับจองออนไลน์'}` : 'กำลังโหลดโปรไฟล์'}</p></div>
            </div>
            <div className="bq-profile-stats">
              <div><span>วันที่ให้บริการ</span><strong>{dateLabel(date)}</strong></div>
              <div><span>คิวรอบริการ</span><strong>{isLoading ? '…' : `${active.length} คิว`}</strong></div>
              <div><span>มูลค่าคิววันนี้</span><strong className="bq-gold">{isLoading ? '…' : money([...active, ...completed].reduce((sum, booking) => sum + booking.totalAmount, 0))}</strong></div>
            </div>
          </section>

          <div className="bq-datebar" aria-label="เลือกวันให้บริการ">
            <button className="bq-icon" title="วันก่อนหน้า" aria-label="วันก่อนหน้า" onClick={() => changeDate(-1)} type="button"><ChevronLeft size={18} /></button>
            <label className="bq-date"><CalendarDays size={16} /><span>{dateLabel(date)}</span><input aria-label="วันที่ให้บริการ" type="date" value={date} onChange={(event) => { if (event.target.value) onDateChange(event.target.value) }} /></label>
            <button className="bq-icon" title="วันถัดไป" aria-label="วันถัดไป" onClick={() => changeDate(1)} type="button"><ChevronRight size={18} /></button>
            <button className="bq-today" onClick={() => { onDateChange(localDate(new Date())); setView('queue') }} type="button">วันนี้</button>
          </div>

          {showCurrent && !isLoading && !error && <section className="bq-shift" aria-label="สถานะการทำงาน">
            <div className="bq-shift-heading"><Scissors size={16} /><h2>สถานะการทำงาน</h2><span className={`bq-badge ${inService ? 'bq-badge-green' : ''}`}>{inService ? 'กำลังให้บริการ' : profile?.isAvailable ? 'พร้อมรับงาน' : 'พักงาน'}</span></div>
            {inService ? (
              <button className="bq-shift-body bq-shift-open" type="button" disabled={isBusy} onClick={() => onSelect(inService)} aria-label={`ดูรายละเอียดคิวที่กำลังให้บริการ ${inService.customerName || 'ลูกค้าหน้าร้าน'}`} aria-haspopup="dialog">
                <span className="bq-shift-symbol"><Scissors size={21} /></span>
                <span className="bq-shift-copy"><span>คิวที่กำลังให้บริการ</span><strong>{inService.customerName || 'ลูกค้าหน้าร้าน'}</strong></span>
                <ArrowRight className="bq-shift-arrow" size={19} aria-hidden="true" />
              </button>
            ) : (
              <div className="bq-shift-body"><span className="bq-shift-symbol"><Clock3 size={21} /></span><div><p>{upcoming ? 'นัดหมายถัดไป' : 'ไม่มีคิวรอให้บริการ'}</p><strong>{upcoming ? `${time(upcoming.startAt)} - ${time(upcoming.endAt)} น.` : working.length ? `รอชำระเงิน ${working.length} คิว` : completed.length ? 'ครบทุกคิวแล้ว' : 'ยังไม่มีนัดหมาย'}</strong></div></div>
            )}
          </section>}
          <nav className="bq-desktop-nav" aria-label="เมนูช่างบนคอมพิวเตอร์">
            <button aria-current={view === 'queue' ? 'page' : undefined} onClick={() => setView('queue')} type="button"><ListOrdered size={18} />คิวให้บริการ</button>
            <button aria-current={view === 'history' ? 'page' : undefined} onClick={() => setView('history')} type="button"><History size={18} />ประวัติของวันที่เลือก</button>
            <button onClick={onLeave} type="button"><CalendarDays size={18} />ขอลา / ติดตามผล</button>
          </nav>
        </div>

        <section className="bq-queue" aria-label="รายการคิว" aria-busy={isLoading}>
          {view === 'queue' && <div className="bq-filters" aria-label="กรองคิว">
            {[{ id: 'all', label: 'ทั้งหมด', count: active.length }, { id: 'waiting', label: 'รอให้บริการ', count: waiting.length }, { id: 'working', label: 'กำลังทำ / รอจ่าย', count: working.length }].map((item) => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} type="button">{item.label}<span>{item.count}</span></button>)}
          </div>}
          <div className="bq-list-heading"><h2>{view === 'history' ? <History size={19} /> : <ListOrdered size={19} />}{view === 'history' ? 'ประวัติของวันที่เลือก' : showCurrent ? 'คิวตัดผมในวันนี้' : 'คิวของวันที่เลือก'}</h2><span className="bq-badge">{visible.length} คิว</span></div>
          {error && <div className="bq-error" role="alert"><p>{error}</p><button onClick={onRefresh} disabled={isLoading} type="button">ลองอีกครั้ง</button></div>}
          {isLoading ? <div className="bq-empty" role="status"><RefreshCw size={23} className="bq-spinning" /><p>กำลังโหลดคิว</p></div> : visible.length > 0 ? <div className="bq-list">{visible.map(renderBooking)}</div> : !error && <div className="bq-empty"><Scissors size={26} /><h3>{view === 'history' ? 'ยังไม่มีประวัติในวันนี้' : active.length ? 'ไม่มีคิวในสถานะนี้' : 'ยังไม่มีคิวในวันที่เลือก'}</h3></div>}
          {view === 'queue' && !isLoading && <details className="bq-completed"><summary><History size={18} /><span>ให้บริการเสร็จแล้ว ({completed.length})</span><ChevronDown size={16} /></summary><div className="bq-completed-list">{completed.length ? completed.map(renderBooking) : <p>ยังไม่มีคิวที่เสร็จสิ้น</p>}</div></details>}
          {view === 'queue' && !isLoading && history.some((booking) => booking.bookingStatus !== 'Completed') && <button className="bq-history-link" onClick={() => setView('history')} type="button">ดูรายการยกเลิก / ไม่มาตามนัด<ArrowRight size={15} /></button>}
        </section>
      </div>

      <nav className="bq-bottom-nav" aria-label="เมนูช่าง">
        <button aria-current={view === 'queue' ? 'page' : undefined} onClick={() => setView('queue')} type="button"><ListOrdered size={20} /><span>{showCurrent ? 'คิววันนี้' : 'คิวตามวัน'}</span></button>
        <button aria-current={view === 'history' ? 'page' : undefined} onClick={() => setView('history')} type="button"><History size={20} /><span>ประวัติคิว</span></button>
        <button onClick={onLeave} type="button"><CalendarDays size={20} /><span>ขอลา</span></button>
        <button onClick={onProfile} type="button"><UserRound size={20} /><span>โปรไฟล์</span></button>
      </nav>
    </>
  )
}
