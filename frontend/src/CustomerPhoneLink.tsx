import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { Booking } from './App'

export function CustomerPhoneLink({ booking, showNumber = false }: { booking: Booking; showNumber?: boolean }) {
  const [feedback, setFeedback] = useState({ phone: '', message: '', copied: false })
  const phone = booking.customerPhoneNumber?.trim().replace(/[\s().-]/g, '')
  if (!phone || !/^\+?\d{7,15}$/.test(phone)) return null
  const current = feedback.phone === phone ? feedback : null
  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(phone!)
      setFeedback({ phone: phone!, message: 'คัดลอกแล้ว', copied: true })
    } catch {
      setFeedback({ phone: phone!, message: 'คัดลอกไม่ได้ กรุณาเลือกข้อความเบอร์เพื่อคัดลอก', copied: false })
    }
  }
  const label = `คัดลอกเบอร์ ${booking.customerName || 'ลูกค้าหน้าร้าน'} ${booking.customerPhoneNumber}`
  return <span className={`bq-phone-copy${showNumber ? ' bq-phone-copy-full' : ''}`}>
    <button type="button" className={`bq-customer-phone bq-customer-phone-copy${showNumber ? ' bq-customer-phone-full' : ''}`} onClick={() => void copyPhone()} aria-label={label} title={label}>
      {current?.copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
      <span>{showNumber && <span>เบอร์โทรลูกค้า</span>}<strong>{booking.customerPhoneNumber}</strong></span>
    </button>
    <span className="bq-phone-feedback" role="status">{current?.message}</span>
  </span>
}
