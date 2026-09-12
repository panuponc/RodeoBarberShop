import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Banknote, Check, CircleCheck, QrCode, RefreshCw, X } from 'lucide-react'
import type { Booking, PaymentSummary, Receipt } from './App'

type Props = {
  booking: Booking
  api: <T>(path: string, options?: RequestInit) => Promise<T>
  onClose: () => void
  onPaid: (bookingId: string) => void
  onCorrected: (bookingId: string) => void
}

const money = (value: number, minimumFractionDigits = 2) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits }).format(value)
const methods: Record<string, string> = { QrPayment: 'QR พร้อมเพย์', Cash: 'เงินสด', BankTransfer: 'โอนเงิน' }

export function BarberCheckout({ booking, api, onClose, onPaid, onCorrected }: Props) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [method, setMethod] = useState<'QrPayment' | 'Cash'>('QrPayment')
  const [confirming, setConfirming] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [reason, setReason] = useState('')
  const [paid, setPaid] = useState(booking.paymentStatus === 'Paid')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const paidRef = useRef(paid)
  const submittingRef = useRef(false)
  const request = useRef<AbortController | null>(null)
  const panel = useRef<HTMLElement>(null)
  const confirmationTitle = useRef<HTMLHeadingElement>(null)
  const receivedButton = useRef<HTMLButtonElement>(null)
  const confirmingRef = useRef(confirming)
  const previousConfirming = useRef(false)
  const reasonInput = useRef<HTMLTextAreaElement>(null)
  const correctionButton = useRef<HTMLButtonElement>(null)
  const correctingRef = useRef(false)
  const previousCorrecting = useRef(false)
  confirmingRef.current = confirming
  correctingRef.current = correcting
  const actions = useRef({ api, onClose, onPaid, onCorrected })
  actions.current = { api, onClose, onPaid, onCorrected }

  function markUnpaid() {
    if (paidRef.current) {
      paidRef.current = false
      setPaid(false)
      setMethod('QrPayment')
      actions.current.onCorrected(booking.id)
    }
    setReceipt(null)
    setCorrecting(false)
    setReason('')
  }

  function markPaid() {
    if (!paidRef.current) {
      paidRef.current = true
      setPaid(true)
      actions.current.onPaid(booking.id)
    }
    setSummary(null)
    setConfirming(false)
  }

  async function loadReceipt(signal?: AbortSignal) {
    const result = await actions.current.api<Receipt>(`/api/payments/booking/${booking.id}/receipt`, { signal })
    if (!signal?.aborted) setReceipt(result)
  }

  async function load() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    setConfirming(false)
    setCorrecting(false)
    setSummary(null)
    setReceipt(null)
    try {
      // Always reconcile with the server, including after a lost correction response.
      const result = await actions.current.api<PaymentSummary>(`/api/payments/booking/${booking.id}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (result.paymentStatus === 'Paid') {
        markPaid()
        await loadReceipt(controller.signal)
      } else if (result.bookingStatus !== 'WaitingPayment') {
        setError('สถานะคิวเปลี่ยนแล้ว กรุณาปิดหน้าต่างและรีเฟรชคิว')
      } else {
        markUnpaid()
        setSummary(result)
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'โหลดสถานะชำระเงินไม่สำเร็จ กรุณาตรวจสถานะอีกครั้ง')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const previousFocus = document.activeElement as HTMLElement | null
    panel.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submittingRef.current) {
        if (confirmingRef.current) setConfirming(false)
        else if (correctingRef.current) setCorrecting(false)
        else actions.current.onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current || document.activeElement === confirmationTitle.current)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current || document.activeElement === confirmationTitle.current)) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      request.current?.abort()
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
    // The parent keys this dialog by booking ID; callbacks are read through actions.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (confirming) {
      if (panel.current) panel.current.scrollTop = 0
      confirmationTitle.current?.focus()
    } else if (previousConfirming.current) {
      (receivedButton.current ?? panel.current)?.focus()
    }
    previousConfirming.current = confirming
  }, [confirming])

  useEffect(() => {
    if (correcting) {
      if (panel.current) panel.current.scrollTop = 0
      reasonInput.current?.focus()
    } else if (previousCorrecting.current) {
      (correctionButton.current ?? panel.current)?.focus()
    }
    previousCorrecting.current = correcting
  }, [correcting])

  async function correctPayment(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current || loading || !paidRef.current || !correcting || !receipt?.canCorrectPayment || reason.trim().length < 3) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      await actions.current.api(`/api/payments/${receipt.paymentId}/correct`, {
        method: 'POST', body: JSON.stringify({ reason: reason.trim() }),
      })
      markUnpaid()
      setMethod('QrPayment')
      await load()
    } catch (cause) {
      // A failed response does not establish whether the correction was committed.
      setReceipt(null)
      setCorrecting(false)
      setError(`${cause instanceof Error ? cause.message : 'แก้ไขการรับเงินไม่สำเร็จ'} กรุณาตรวจสถานะอีกครั้งก่อนทำต่อ`)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (submittingRef.current || paidRef.current || !summary || !confirming || loading || (method === 'QrPayment' && !summary.qrImageDataUrl)) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      await actions.current.api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: booking.id,
          paymentAccountId: method === 'QrPayment' ? summary.paymentAccount?.id : null,
          paymentMethod: method,
          note: method === 'Cash' ? 'Barber confirmed cash received in full' : 'Barber verified payment to shop account',
        }),
      })
      // Keep the payment final even if the following receipt request fails.
      markPaid()
      await loadReceipt()
    } catch (cause) {
      setSummary(null)
      setConfirming(false)
      setError(paidRef.current ? 'รับเงินแล้ว แต่โหลดใบเสร็จไม่สำเร็จ กรุณาลองโหลดอีกครั้ง' : `${cause instanceof Error ? cause.message : 'ยืนยันรับเงินไม่สำเร็จ'} กรุณาตรวจสถานะอีกครั้งก่อนทำต่อ`)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingRef.current) onClose() }}>
      <article className="detail-panel bq-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="bq-checkout-title" aria-describedby={confirming ? 'bq-confirm-prompt' : undefined} tabIndex={-1} ref={panel}>
        <div className="booking-detail-header">
          <div><span className="modal-eyebrow">{correcting ? 'กลับไปรอชำระเงิน' : paid ? 'รับชำระเรียบร้อย' : 'จบบริการ / รับชำระเงิน'}</span><h2 id="bq-checkout-title">{correcting ? 'แก้ไขการรับเงินผิด' : paid ? 'ใบเสร็จรับเงิน' : booking.customerName || 'ลูกค้าหน้าร้าน'}</h2><small className="booking-number-chip">เลขจอง {booking.bookingNumber}</small></div>
          <button className="icon-button" type="button" aria-label="ปิดหน้าชำระเงิน" title="ปิด" disabled={submitting} onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={correcting ? correctPayment : confirm}>
          <div className="bq-checkout-body">
            {paid && receipt && !correcting && <div className="bq-payment-success" role="status"><CircleCheck size={20} /><span>รับเงินแล้ว · จบคิวเรียบร้อย</span></div>}
            {loading && <div className="bq-checkout-loading" role="status"><RefreshCw size={22} className="bq-spinning" />กำลังโหลด{paid ? 'ใบเสร็จ' : 'ข้อมูลชำระเงิน'}</div>}
            {error && <div className="bq-error" role="alert"><p>{error}</p><button type="button" disabled={loading || submitting} onClick={() => void load()}>ตรวจสถานะอีกครั้ง</button></div>}
            {correcting && receipt && <section className="bq-payment-correction">
              <div className="bq-checkout-total"><span>{methods[receipt.paymentMethod] || receipt.paymentMethod}</span><strong>{money(receipt.totalAmount)}</strong></div>
              <p>ใช้เมื่อกดยืนยันผิดและยังไม่ได้รับเงิน ไม่ใช่การคืนเงิน</p>
              <p className="bq-confirm-note">รายการเดิมจะถูกยกเลิกและเก็บประวัติไว้ คิวจะกลับไปรอชำระ พร้อมเปิด QR อีกครั้ง</p>
              <label htmlFor="bq-correction-reason">เหตุผลที่แก้ไข</label>
              <textarea id="bq-correction-reason" ref={reasonInput} value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={500} rows={3} disabled={submitting} placeholder="เช่น เผลอกดยืนยัน ลูกค้ายังไม่ได้โอน" />
            </section>}
            {!paid && summary && !confirming && <>
              <div className="bq-checkout-total"><span>ยอดชำระ</span><strong>{money(summary.totalAmount)}</strong></div>
              <div className="bq-payment-methods" role="group" aria-label="วิธีชำระเงิน">
                <button type="button" aria-pressed={method === 'QrPayment'} disabled={submitting} onClick={() => setMethod('QrPayment')}><QrCode size={18} />QR พร้อมเพย์</button>
                <button type="button" aria-pressed={method === 'Cash'} disabled={submitting} onClick={() => setMethod('Cash')}><Banknote size={18} />เงินสด</button>
              </div>
              {method === 'QrPayment' ? summary.qrImageDataUrl ? <div className="bq-payment-qr"><img src={summary.qrImageDataUrl} alt={`QR พร้อมเพย์ชำระ ${money(summary.totalAmount)}`} /><span>บัญชีรับเงินของร้าน</span><strong>{summary.paymentAccount?.accountName}</strong></div> : <p className="bq-payment-unavailable">ยังไม่มีบัญชีพร้อมเพย์ที่ใช้งานได้ ให้เจ้าของร้านตั้งค่าบัญชีรับเงิน หรือเลือกรับเงินสด</p> : <div className="bq-cash-note"><Banknote size={30} /><span>รับเงินสด {money(summary.totalAmount)}</span></div>}
            </>}
            {!paid && summary && confirming && <section className="bq-payment-confirmation">
              <h3 id="bq-confirm-prompt" tabIndex={-1} ref={confirmationTitle}>ได้รับเงินครบแล้วใช่ไหม?</h3>
              <div className="bq-checkout-total"><strong>{money(summary.totalAmount)}</strong></div>
              <span className="bq-confirm-method">{method === 'Cash' ? <Banknote size={20} /> : <QrCode size={20} />}{methods[method]}</span>
              {method === 'QrPayment' && <p className="bq-confirm-account">{summary.paymentAccount?.accountName}</p>}
              <p className="bq-confirm-note">{method === 'Cash' ? 'ยืนยันว่าได้รับเงินสดครบตามยอดแล้ว' : 'ยืนยันว่าเงินเข้าบัญชีร้านครบตามยอดแล้ว'}</p>
            </section>}
            {receipt && !correcting && <section className="bq-receipt" aria-label="ใบเสร็จ">
              <h3>{receipt.shopName}</h3><p className="bq-receipt-number">{receipt.paymentNumber}</p>
              <dl><div><dt>ลูกค้า</dt><dd>{receipt.customerName || booking.customerName || 'ลูกค้าหน้าร้าน'}</dd></div><div><dt>ช่าง</dt><dd>{receipt.barberName}</dd></div><div><dt>รับชำระ</dt><dd>{methods[receipt.paymentMethod] || receipt.paymentMethod}</dd></div><div><dt>วันที่</dt><dd>{new Date(receipt.paidAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div></dl>
              <div className="bq-receipt-services">{receipt.services.map((service) => <div key={service.serviceId}><span>{service.serviceName}{service.quantity > 1 ? ` × ${service.quantity}` : ''}</span><strong>{money(service.lineTotal)}</strong></div>)}</div>
              <div className="bq-receipt-total"><span>ชำระแล้ว</span><strong>{money(receipt.totalAmount)}</strong></div>
            </section>}
          </div>
          <div className={`booking-detail-actions${(confirming && !paid) || correcting ? ' bq-confirm-actions' : ''}`}>
            {correcting ? <>
              <button key="cancel-correction" className="secondary" type="button" disabled={submitting} onClick={() => setCorrecting(false)}>ยกเลิก</button>
              <button key="confirm-correction" type="submit" disabled={submitting || loading || reason.trim().length < 3}>{submitting ? 'กำลังแก้ไข...' : 'ยืนยันกลับไปรอชำระ'}</button>
            </> : paid ? <>
              {receipt?.canCorrectPayment && <button key="correct" ref={correctionButton} className="secondary" type="button" disabled={loading || submitting} onClick={() => { setReason(''); setCorrecting(true) }}>แก้ไขการรับเงินผิด</button>}
              <button key="done" type="button" onClick={onClose} disabled={submitting}>กลับไปหน้าคิว</button>
            </> : confirming ? <>
              <button key="back" className="secondary" type="button" disabled={submitting} onClick={() => setConfirming(false)}>กลับไปตรวจสอบ</button>
              <button key="confirm" type="submit" disabled={loading || submitting || !summary}><Check size={17} />{submitting ? 'กำลังบันทึก...' : 'ยืนยันและจบคิว'}</button>
            </> : <button key="received" ref={receivedButton} type="button" disabled={loading || submitting || !summary || (method === 'QrPayment' && !summary.qrImageDataUrl)} onClick={() => setConfirming(true)}><Check size={17} />{summary ? `ได้รับเงินแล้ว · ${money(summary.totalAmount, 0)}` : 'ได้รับเงินแล้ว'}</button>}
          </div>
        </form>
      </article>
    </div>
  )
}
