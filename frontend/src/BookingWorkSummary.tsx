import type { Booking } from './App'
import { bookingWorkSegments } from './bookingWorkSegments'
import './BookingWorkSummary.css'

const time = (value: number) => new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

export function BookingWorkSummary({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const segments = bookingWorkSegments(booking)
  if (!segments.some(segment => segment.added)) return <span className="work-summary-plain">{booking.services.map(service => service.serviceName).join(' + ')}</span>
  return <span className={`work-summary${compact ? ' work-summary-compact' : ''}`}>
    <span className="work-summary-caption">ช่วงงาน · เวลาโดยประมาณ</span>
    {segments.map((segment, index) => {
      const names = segment.services.map(service => `${service.serviceName}${service.quantity > 1 ? ` × ${service.quantity}` : ''}`).join(' + ')
      return <span className={`work-segment${segment.added ? ' work-segment-added' : ''}`} key={index}>
        <span className="work-segment-heading"><span>{segment.added ? 'งานเพิ่ม' : 'งานหลัก'}</span><span className="work-segment-time">{segment.start !== null && segment.end !== null ? `${time(segment.start)}–${time(segment.end)}` : `${segment.minutes} นาที`}</span></span>
        <span className="work-segment-name" title={names}>{names}</span>
      </span>
    })}
  </span>
}
