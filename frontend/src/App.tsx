import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AuthResponse = {
  fullName: string
  email: string
  role: string
  accessToken: string
}

type QueueService = {
  serviceId: string
  serviceName: string
  unitPrice: number
  durationMinutes: number
  quantity: number
  lineTotal: number
}

type QueueBooking = {
  id: string
  bookingNumber: string
  customerName: string | null
  barberName: string | null
  startAt: string
  endAt: string
  totalAmount: number
  bookingStatus: string
  paymentStatus: string
  services: QueueService[]
}

type PaymentSummary = {
  bookingId: string
  totalAmount: number
  paymentAccount: {
    id: string
    accountName: string
  } | null
  qrImageDataUrl: string | null
}

type PaymentAccount = {
  id: string
  accountName: string
  accountType: string
  accountNumber: string
  bankName: string | null
  isActive: boolean
  isDefault: boolean
}

type Receipt = {
  paymentNumber: string
  bookingNumber: string
  shopName: string
  totalAmount: number
}

type QrPreview = {
  paymentAccountId: string
  accountName: string
  amount: number
  qrPayload: string
  qrImageDataUrl: string
}

const nextStatus: Record<string, string> = {
  PendingConfirmation: 'Confirmed',
  Confirmed: 'WaitingService',
  WaitingService: 'InService',
  InService: 'WaitingPayment',
}

const statusLabels: Record<string, string> = {
  PendingConfirmation: 'รอยืนยัน',
  Confirmed: 'ยืนยันแล้ว',
  WaitingService: 'มาถึงร้าน',
  InService: 'กำลังให้บริการ',
  WaitingPayment: 'รอชำระเงิน',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิก',
}

function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(null)
  const [email, setEmail] = useState('owner@rodeobarber.local')
  const [password, setPassword] = useState('')
  const [queue, setQueue] = useState<QueueBooking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<QueueBooking | null>(null)
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [qrPreview, setQrPreview] = useState<QrPreview | null>(null)
  const [qrTestAmount, setQrTestAmount] = useState('100')
  const [qrTestAccountId, setQrTestAccountId] = useState('')
  const [isQrTestOpen, setIsQrTestOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<'queue' | 'accounts'>('queue')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [accountForm, setAccountForm] = useState({
    accountName: 'Rodeo PromptPay',
    accountType: 'PromptPayPhone',
    accountNumber: '',
    bankName: 'PromptPay',
    isDefault: true,
  })

  const defaultPaymentAccount = useMemo(
    () => paymentAccounts.find((account) => account.isActive && account.isDefault),
    [paymentAccounts],
  )

  useEffect(() => {
    if (!auth) return

    void refreshQueue()
    void refreshPaymentAccounts()
    // The refresh functions depend on the current token and are only needed when auth changes.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.message ?? `Request failed with ${response.status}`)
    }

    if (response.status === 204) return undefined as T

    return response.json() as Promise<T>
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      const result = await api<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      setAuth(result)
      setMessage(`เข้าสู่ระบบแล้ว: ${result.fullName} (${result.role})`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsBusy(false)
    }
  }

  async function refreshQueue() {
    try {
      const result = await api<QueueBooking[]>('/api/queue/today')
      setQueue(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดคิวไม่สำเร็จ')
    }
  }

  async function refreshPaymentAccounts() {
    try {
      const result = await api<PaymentAccount[]>('/api/payment-accounts')
      setPaymentAccounts(result)
      setQrTestAccountId((current) => current || result.find((account) => account.isDefault && account.isActive)?.id || '')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดบัญชีร้านไม่สำเร็จ')
    }
  }

  async function moveStatus(booking: QueueBooking) {
    const targetStatus = nextStatus[booking.bookingStatus]
    if (!targetStatus) return

    setIsBusy(true)
    setMessage('')

    try {
      await api(`/api/queue/${booking.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: targetStatus,
          note: `Changed from staff dashboard to ${targetStatus}`,
        }),
      })
      await refreshQueue()
      setSelectedBooking(null)
      setPaymentSummary(null)
      setReceipt(null)
      setMessage(`เปลี่ยนสถานะเป็น ${statusLabels[targetStatus] ?? targetStatus} แล้ว`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function loadPaymentSummary(booking: QueueBooking) {
    setSelectedBooking(booking)
    setReceipt(null)
    setIsBusy(true)
    setMessage('')

    try {
      const result = await api<PaymentSummary>(`/api/payments/booking/${booking.id}`)
      setPaymentSummary(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลด QR ไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function confirmPayment() {
    if (!selectedBooking) return

    setIsBusy(true)
    setMessage('')

    try {
      const payment = await api<{ id: string }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          paymentAccountId: paymentSummary?.paymentAccount?.id ?? defaultPaymentAccount?.id,
          paymentMethod: 'QrPayment',
          note: 'Staff verified customer slip manually',
        }),
      })
      const receiptResult = await api<Receipt>(`/api/payments/${payment.id}/receipt`)

      setReceipt(receiptResult)
      setPaymentSummary(null)
      await refreshQueue()
      setMessage('ยืนยันชำระเงินและออกใบเสร็จแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ยืนยันชำระเงินไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function savePaymentAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      await api('/api/payment-accounts', {
        method: 'POST',
        body: JSON.stringify({ ...accountForm, isActive: true }),
      })
      setAccountForm((current) => ({ ...current, accountNumber: '' }))
      await refreshPaymentAccounts()
      setMessage('เพิ่มบัญชีรับเงินแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เพิ่มบัญชีไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function disablePaymentAccount(account: PaymentAccount) {
    setIsBusy(true)

    try {
      await api(`/api/payment-accounts/${account.id}`, { method: 'DELETE' })
      await refreshPaymentAccounts()
      setMessage('ปิดใช้งานบัญชีแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ปิดใช้งานบัญชีไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function enablePaymentAccount(account: PaymentAccount) {
    setIsBusy(true)
    setMessage('')

    try {
      await api(`/api/payment-accounts/${account.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          accountName: account.accountName,
          accountType: account.accountType,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          isActive: true,
          isDefault: account.isDefault,
        }),
      })
      await refreshPaymentAccounts()
      setMessage('เปิดใช้งานบัญชีแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เปิดใช้งานบัญชีไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function setDefaultPaymentAccount(account: PaymentAccount) {
    setIsBusy(true)
    setMessage('')

    try {
      await api(`/api/payment-accounts/${account.id}/default`, { method: 'PUT' })
      await refreshPaymentAccounts()
      setMessage('ตั้งบัญชีหลักแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ตั้งบัญชีหลักไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function generateQrPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')
    setQrPreview(null)

    try {
      const amount = Number(qrTestAmount)
      const path = qrTestAccountId ? `/api/payment-accounts/${qrTestAccountId}/qr-preview` : '/api/payment-accounts/qr-preview'
      const result = await api<QrPreview>(path, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      })

      setQrPreview(result)
      setMessage('สร้าง QR ทดสอบแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'สร้าง QR ทดสอบไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  if (!auth) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <p className="eyebrow">Rodeo Barber Shop</p>
          <h1>Staff Dashboard</h1>
          <p className="muted">เข้าสู่ระบบด้วยบัญชี Owner หรือ Staff เพื่อจัดการคิว รับเงิน และออกใบเสร็จ</p>

          <form className="login-form" onSubmit={login}>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input
                placeholder="ดูรหัสใน docs/LOCAL_DEV_NOTES.md"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button disabled={isBusy} type="submit">
              {isBusy ? 'กำลังเข้าสู่ระบบ...' : 'Login'}
            </button>
          </form>

          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Staff Dashboard</p>
          <h1>Rodeo Barber Shop</h1>
        </div>
        <div className="user-box">
          <span>{auth.fullName}</span>
          <strong>{auth.role}</strong>
          <button onClick={() => setAuth(null)} type="button">
            Logout
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button className={activePanel === 'queue' ? 'active' : ''} onClick={() => setActivePanel('queue')} type="button">
          คิววันนี้
        </button>
        <button
          className={activePanel === 'accounts' ? 'active' : ''}
          onClick={() => setActivePanel('accounts')}
          type="button"
        >
          บัญชีรับเงิน
        </button>
      </nav>

      {message && <p className="notice">{message}</p>}

      {activePanel === 'queue' ? (
        <section className="work-grid">
          <div className="queue-panel">
            <div className="panel-heading">
              <h2>คิววันนี้</h2>
              <button disabled={isBusy} onClick={refreshQueue} type="button">
                Refresh
              </button>
            </div>

            <div className="queue-list">
              {queue.length === 0 ? (
                <p className="empty-state">ยังไม่มีคิววันนี้</p>
              ) : (
                queue.map((booking) => (
                  <article
                    className={selectedBooking?.id === booking.id ? 'queue-item selected' : 'queue-item'}
                    key={booking.id}
                  >
                    <button onClick={() => setSelectedBooking(booking)} type="button">
                      <span className="booking-time">{formatTime(booking.startAt)}</span>
                      <span>
                        <strong>{booking.customerName ?? 'Walk-in customer'}</strong>
                        <small>{booking.bookingNumber}</small>
                      </span>
                      <span className={`status-pill status-${booking.bookingStatus}`}>{statusLabels[booking.bookingStatus]}</span>
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="detail-panel">
            {selectedBooking ? (
              <>
                <div className="panel-heading">
                  <h2>{selectedBooking.customerName}</h2>
                  <span className={`status-pill status-${selectedBooking.bookingStatus}`}>
                    {statusLabels[selectedBooking.bookingStatus]}
                  </span>
                </div>

                <dl className="summary-list">
                  <div>
                    <dt>ช่าง</dt>
                    <dd>{selectedBooking.barberName}</dd>
                  </div>
                  <div>
                    <dt>เวลา</dt>
                    <dd>
                      {formatTime(selectedBooking.startAt)} - {formatTime(selectedBooking.endAt)}
                    </dd>
                  </div>
                  <div>
                    <dt>ยอดชำระ</dt>
                    <dd>{formatMoney(selectedBooking.totalAmount)}</dd>
                  </div>
                </dl>

                <div className="service-list">
                  {selectedBooking.services.map((service) => (
                    <div key={service.serviceId}>
                      <span>{service.serviceName}</span>
                      <strong>{formatMoney(service.lineTotal)}</strong>
                    </div>
                  ))}
                </div>

                <div className="action-row">
                  {nextStatus[selectedBooking.bookingStatus] && (
                    <button disabled={isBusy} onClick={() => moveStatus(selectedBooking)} type="button">
                      เปลี่ยนเป็น {statusLabels[nextStatus[selectedBooking.bookingStatus]]}
                    </button>
                  )}
                  {selectedBooking.bookingStatus === 'WaitingPayment' && (
                    <button className="secondary" disabled={isBusy} onClick={() => loadPaymentSummary(selectedBooking)} type="button">
                      แสดง QR
                    </button>
                  )}
                </div>

                {paymentSummary && (
                  <section className="payment-box">
                    <h3>QR ชำระเงิน</h3>
                    {paymentSummary.qrImageDataUrl ? (
                      <img alt="Payment QR code" src={paymentSummary.qrImageDataUrl} />
                    ) : (
                      <p className="empty-state">ยังไม่มีบัญชี PromptPay ที่ใช้งานอยู่</p>
                    )}
                    <strong>{formatMoney(paymentSummary.totalAmount)}</strong>
                    <small>{paymentSummary.paymentAccount?.accountName}</small>
                    <button disabled={isBusy || !paymentSummary.qrImageDataUrl} onClick={confirmPayment} type="button">
                      ยืนยันรับเงินแล้ว
                    </button>
                  </section>
                )}

                {receipt && (
                  <section className="receipt-box">
                    <h3>ใบเสร็จ</h3>
                    <p>{receipt.paymentNumber}</p>
                    <p>{receipt.shopName}</p>
                    <strong>{formatMoney(receipt.totalAmount)}</strong>
                  </section>
                )}
              </>
            ) : (
              <p className="empty-state">เลือกคิวเพื่อดูรายละเอียด</p>
            )}
          </aside>
        </section>
      ) : (
        <section className="accounts-grid">
          <form className="account-form" onSubmit={savePaymentAccount}>
            <h2>เพิ่มบัญชีรับเงิน</h2>
            <label>
              ชื่อบัญชี
              <input
                value={accountForm.accountName}
                onChange={(event) => setAccountForm({ ...accountForm, accountName: event.target.value })}
              />
            </label>
            <label>
              ประเภท
              <select
                value={accountForm.accountType}
                onChange={(event) => setAccountForm({ ...accountForm, accountType: event.target.value })}
              >
                <option value="PromptPayPhone">PromptPay เบอร์โทร</option>
                <option value="PromptPayNationalId">PromptPay เลขบัตรประชาชน</option>
                <option value="BankAccount">เลขบัญชีธนาคาร</option>
              </select>
            </label>
            <label>
              เลขบัญชี / PromptPay
              <input
                value={accountForm.accountNumber}
                onChange={(event) => setAccountForm({ ...accountForm, accountNumber: event.target.value })}
              />
            </label>
            <label>
              ธนาคาร
              <input
                value={accountForm.bankName}
                onChange={(event) => setAccountForm({ ...accountForm, bankName: event.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <input
                checked={accountForm.isDefault}
                onChange={(event) => setAccountForm({ ...accountForm, isDefault: event.target.checked })}
                type="checkbox"
              />
              ตั้งเป็นบัญชีหลัก
            </label>
            <button disabled={isBusy} type="submit">
              บันทึกบัญชี
            </button>
          </form>

          <div className="account-list">
            <div className="panel-heading">
              <h2>บัญชีรับเงินร้าน</h2>
              <button disabled={isBusy} onClick={refreshPaymentAccounts} type="button">
                Refresh
              </button>
            </div>
            {paymentAccounts.length === 0 ? (
              <p className="empty-state">ยังไม่มีบัญชีรับเงิน</p>
            ) : (
              paymentAccounts.map((account) => (
                <article className="account-card" key={account.id}>
                  <div>
                    <strong>{account.accountName}</strong>
                    <span>{account.accountType}</span>
                    <small>
                      {account.bankName} / {account.accountNumber}
                    </small>
                  </div>
                  <div className="account-actions">
                    {account.isDefault && <span className="status-pill">Default</span>}
                    {!account.isActive && <span className="status-pill muted-pill">Inactive</span>}
                    {account.isActive && !account.isDefault && (
                      <button
                        className="secondary"
                        disabled={isBusy}
                        onClick={() => setDefaultPaymentAccount(account)}
                        type="button"
                      >
                        ตั้งเป็นบัญชีหลัก
                      </button>
                    )}
                    {!account.isActive && (
                      <button className="secondary" disabled={isBusy} onClick={() => enablePaymentAccount(account)} type="button">
                        เปิดใช้งาน
                      </button>
                    )}
                    {account.isActive && (
                      <button className="secondary" disabled={isBusy} onClick={() => disablePaymentAccount(account)} type="button">
                        ปิดใช้งาน
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}

            <section className={isQrTestOpen ? 'qr-test-box open' : 'qr-test-box'}>
              <div className="panel-heading">
                <div>
                  <h2>ทดสอบ QR</h2>
                  <p className="muted">ใช้ตรวจบัญชีหลัก โดยไม่สร้างรายการชำระเงินจริง</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    setIsQrTestOpen((current) => !current)
                    setQrPreview(null)
                  }}
                  type="button"
                >
                  {isQrTestOpen ? 'พับเก็บ' : 'เปิดทดสอบ'}
                </button>
              </div>

              {isQrTestOpen && (
                <form className="qr-test-form" onSubmit={generateQrPreview}>
                  <label>
                    บัญชีสำหรับทดสอบ
                    <select value={qrTestAccountId} onChange={(event) => setQrTestAccountId(event.target.value)}>
                      <option value="">บัญชีหลักอัตโนมัติ</option>
                      {paymentAccounts
                        .filter((account) => account.isActive)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.accountName} {account.isDefault ? '(บัญชีหลัก)' : ''}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    ยอดทดสอบ
                    <input
                      min="1"
                      step="0.01"
                      type="number"
                      value={qrTestAmount}
                      onChange={(event) => setQrTestAmount(event.target.value)}
                    />
                  </label>

                  <button disabled={isBusy} type="submit">
                    Gen QR ทดสอบ
                  </button>

                  {qrPreview && (
                    <div className="qr-preview-result">
                      <img alt="QR preview" src={qrPreview.qrImageDataUrl} />
                      <div>
                        <strong>{formatMoney(qrPreview.amount)}</strong>
                        <span>{qrPreview.accountName}</span>
                        <small>พร้อมให้สแกนทดสอบผ่านแอปธนาคาร</small>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </section>
          </div>
        </section>
      )}
    </main>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(value)
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value))
}

export default App
