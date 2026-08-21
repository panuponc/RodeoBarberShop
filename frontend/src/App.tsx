import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AuthResponse = {
  fullName: string
  email: string
  role: string
  accessToken: string
}

type Service = {
  id: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
}

type Barber = {
  id: string
  fullName: string
  specialty: string | null
  experienceYears: number | null
  isAvailable: boolean
  acceptsBooking: boolean
}

type AvailabilitySlot = {
  startAt: string
  endAt: string
  isAvailable: boolean
}

type BookingService = {
  serviceId: string
  serviceName: string
  unitPrice: number
  durationMinutes: number
  quantity: number
  lineTotal: number
}

type Booking = {
  id: string
  bookingNumber: string
  customerName: string | null
  barberName: string | null
  startAt: string
  endAt: string
  totalAmount: number
  bookingStatus: string
  paymentStatus: string
  services: BookingService[]
}

type PaymentSummary = {
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
  customerName: string | null
  barberName: string | null
  paidAt: string
  paymentMethod: string
  totalAmount: number
  services: BookingService[]
}

type QrPreview = {
  accountName: string
  amount: number
  qrImageDataUrl: string
}

type StaffAccount = {
  id: string
  barberProfileId: string | null
  fullName: string
  nickname: string | null
  email: string
  phoneNumber: string
  role: 'Barber' | 'FrontDeskStaff'
  accountStatus: string
  startDate: string | null
  note: string | null
  specialty: string | null
  experienceYears: number | null
  bio: string | null
  isAvailable: boolean
  acceptsBooking: boolean
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthPasswordVisible, setIsAuthPasswordVisible] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const [queue, setQueue] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [staffReceipt, setStaffReceipt] = useState<Receipt | null>(null)
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [qrPreview, setQrPreview] = useState<QrPreview | null>(null)
  const [qrTestAmount, setQrTestAmount] = useState('100')
  const [qrTestAccountId, setQrTestAccountId] = useState('')
  const [isQrTestOpen, setIsQrTestOpen] = useState(false)
  const [activeStaffPanel, setActiveStaffPanel] = useState<'queue' | 'accounts' | 'staff'>('queue')
  const [accountForm, setAccountForm] = useState({
    accountName: 'Rodeo PromptPay',
    accountType: 'PromptPayPhone',
    accountNumber: '',
    bankName: 'PromptPay',
    isDefault: true,
  })
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([])
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    nickname: '',
    phoneNumber: '',
    email: '',
    password: 'StaffPassword123!',
    role: 'Barber' as 'Barber' | 'FrontDeskStaff',
    startDate: '',
    note: '',
    specialty: '',
    experienceYears: '',
    bio: '',
    isAvailable: true,
    acceptsBooking: true,
  })
  const [isStaffPasswordVisible, setIsStaffPasswordVisible] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [bookingDate, setBookingDate] = useState(getTomorrowDate())
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [customerReceipt, setCustomerReceipt] = useState<Receipt | null>(null)

  const defaultPaymentAccount = useMemo(
    () => paymentAccounts.find((account) => account.isActive && account.isDefault),
    [paymentAccounts],
  )

  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id))
  const selectedTotal = selectedServices.reduce((total, service) => total + service.price, 0)
  const canManageStaff = auth?.role === 'Owner' || auth?.role === 'Admin'

  useEffect(() => {
    if (!auth) return

    if (auth.role === 'Customer') {
      void refreshCustomerData()
    } else {
      void refreshQueue()
      void refreshPaymentAccounts()
      if (auth.role === 'Owner' || auth.role === 'Admin') {
        void refreshStaffAccounts()
      }
    }
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

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body =
        authMode === 'login'
          ? { email, password }
          : { fullName, phoneNumber, email, password }
      const result = await api<AuthResponse>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      setAuth(result)
      setMessage(`เข้าสู่ระบบแล้ว: ${result.fullName} (${result.role})`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function refreshCustomerData() {
    try {
      const [serviceResult, barberResult, bookingResult] = await Promise.all([
        api<Service[]>('/api/services'),
        api<Barber[]>('/api/barbers'),
        api<Booking[]>('/api/bookings/my'),
      ])

      setServices(serviceResult)
      setBarbers(barberResult)
      setMyBookings(bookingResult)
      setSelectedBarberId((current) => current || barberResult[0]?.id || '')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดข้อมูลลูกค้าไม่สำเร็จ')
    }
  }

  async function checkAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')
    setAvailability([])

    try {
      if (!selectedBarberId || selectedServiceIds.length === 0) {
        throw new Error('กรุณาเลือกบริการและช่างก่อน')
      }

      const params = new URLSearchParams({ barberId: selectedBarberId, date: bookingDate })
      selectedServiceIds.forEach((serviceId) => params.append('serviceIds', serviceId))

      const result = await api<AvailabilitySlot[]>(`/api/bookings/availability?${params}`)
      setAvailability(result.filter((slot) => slot.isAvailable))
      setMessage(result.some((slot) => slot.isAvailable) ? 'เลือกเวลาที่ต้องการจองได้เลย' : 'วันนี้ยังไม่มีเวลาว่าง')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เช็คเวลาว่างไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function createBooking(slot: AvailabilitySlot) {
    setIsBusy(true)
    setMessage('')

    try {
      await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          barberId: selectedBarberId,
          startAt: slot.startAt,
          serviceIds: selectedServiceIds,
          customerNote: 'Booked from customer dashboard',
        }),
      })

      setAvailability([])
      await refreshCustomerData()
      setMessage('จองคิวสำเร็จแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'จองคิวไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function loadCustomerReceipt(booking: Booking) {
    setIsBusy(true)
    setCustomerReceipt(null)
    setMessage('')

    try {
      const result = await api<Receipt>(`/api/payments/booking/${booking.id}/receipt`)
      setCustomerReceipt(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ยังไม่พบใบเสร็จของรายการนี้')
    } finally {
      setIsBusy(false)
    }
  }

  async function refreshQueue() {
    try {
      const result = await api<Booking[]>('/api/queue/today')
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

  async function refreshStaffAccounts() {
    try {
      const result = await api<StaffAccount[]>('/api/staff')
      setStaffAccounts(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดรายชื่อพนักงานไม่สำเร็จ')
    }
  }

  async function moveStatus(booking: Booking) {
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
      setStaffReceipt(null)
      setMessage(`เปลี่ยนสถานะเป็น ${statusLabels[targetStatus] ?? targetStatus} แล้ว`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เปลี่ยนสถานะไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function loadPaymentSummary(booking: Booking) {
    setSelectedBooking(booking)
    setStaffReceipt(null)
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

      setStaffReceipt(receiptResult)
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

  async function saveStaffAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      await api('/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          fullName: staffForm.fullName,
          nickname: staffForm.nickname || null,
          phoneNumber: staffForm.phoneNumber,
          email: staffForm.email,
          password: staffForm.password,
          role: staffForm.role,
          startDate: staffForm.startDate || null,
          note: staffForm.note || null,
          specialty: staffForm.specialty || null,
          experienceYears: staffForm.experienceYears ? Number(staffForm.experienceYears) : null,
          bio: staffForm.bio || null,
          isAvailable: staffForm.role === 'Barber' ? staffForm.isAvailable : false,
          acceptsBooking: staffForm.role === 'Barber' ? staffForm.acceptsBooking : false,
        }),
      })

      setStaffForm((current) => ({
        ...current,
        fullName: '',
        nickname: '',
        phoneNumber: '',
        email: '',
        specialty: '',
        experienceYears: '',
        bio: '',
        note: '',
      }))
      await refreshStaffAccounts()
      setMessage('เพิ่มบัญชีพนักงานแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เพิ่มบัญชีพนักงานไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function updateStaffStatus(staff: StaffAccount, accountStatus: string) {
    setIsBusy(true)
    setMessage('')

    try {
      await api(`/api/staff/${staff.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: staff.fullName,
          nickname: staff.nickname,
          phoneNumber: staff.phoneNumber,
          role: staff.role,
          accountStatus,
          startDate: staff.startDate,
          note: staff.note,
          specialty: staff.specialty,
          experienceYears: staff.experienceYears,
          bio: staff.bio,
          isAvailable: accountStatus === 'Active' && staff.role === 'Barber' ? staff.isAvailable : false,
          acceptsBooking: accountStatus === 'Active' && staff.role === 'Barber' ? staff.acceptsBooking : false,
        }),
      })
      await refreshStaffAccounts()
      setMessage(accountStatus === 'Active' ? 'เปิดใช้งานพนักงานแล้ว' : 'ปิดใช้งานพนักงานแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'อัปเดตสถานะพนักงานไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  function logout() {
    setAuth(null)
    setQueue([])
    setMyBookings([])
    setAvailability([])
    setSelectedBooking(null)
    setPaymentSummary(null)
    setCustomerReceipt(null)
    setStaffReceipt(null)
  }

  if (!auth) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <p className="eyebrow">Rodeo Barber Shop</p>
          <h1>{authMode === 'login' ? 'Login' : 'Customer Signup'}</h1>
          <p className="muted">
            {authMode === 'login'
              ? 'เข้าสู่ระบบครั้งเดียว ระบบจะพาไปหน้าลูกค้าหรือหน้าร้านตามสิทธิ์ของบัญชี'
              : 'สมัครสมาชิกสำหรับลูกค้าเพื่อจองคิวออนไลน์'}
          </p>

          <form className="login-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <>
                <label>
                  ชื่อ-นามสกุล
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
                </label>
                <label>
                  เบอร์โทร
                  <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
                </label>
              </>
            )}
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <PasswordInput
                isVisible={isAuthPasswordVisible}
                onChange={setPassword}
                onToggleVisibility={() => setIsAuthPasswordVisible((current) => !current)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                value={password}
              />
            </label>
            <button disabled={isBusy} type="submit">
              {isBusy ? 'กำลังดำเนินการ...' : authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === 'login' ? (
              <>
                <span>ยังไม่มีบัญชีลูกค้า?</span>
                <button className="link-button" onClick={() => setAuthMode('register')} type="button">
                  สมัครสมาชิก
                </button>
              </>
            ) : (
              <>
                <span>มีบัญชีแล้ว?</span>
                <button className="link-button" onClick={() => setAuthMode('login')} type="button">
                  กลับไป Login
                </button>
              </>
            )}
          </div>

          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    )
  }

  if (auth.role === 'Customer') {
    return (
      <main className="dashboard-shell">
        <Header auth={auth} eyebrow="Customer Booking" onLogout={logout} />
        {message && <p className="notice">{message}</p>}

        <section className="customer-grid">
          <form className="booking-panel" onSubmit={checkAvailability}>
            <div className="panel-heading">
              <h2>จองคิว</h2>
              <strong>{formatMoney(selectedTotal)}</strong>
            </div>

            <div className="service-choice-grid">
              {services.map((service) => (
                <label className="choice-card" key={service.id}>
                  <input
                    checked={selectedServiceIds.includes(service.id)}
                    onChange={(event) => {
                      setSelectedServiceIds((current) =>
                        event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id),
                      )
                    }}
                    type="checkbox"
                  />
                  <span>
                    <strong>{service.name}</strong>
                    <small>
                      {formatMoney(service.price)} / {service.durationMinutes} นาที
                    </small>
                  </span>
                </label>
              ))}
            </div>

            <label>
              เลือกช่าง
              <select value={selectedBarberId} onChange={(event) => setSelectedBarberId(event.target.value)}>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.fullName} {barber.specialty ? `- ${barber.specialty}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              วันที่
              <input value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} type="date" />
            </label>

            <button disabled={isBusy} type="submit">
              เช็คเวลาว่าง
            </button>

            {availability.length > 0 && (
              <div className="slot-grid">
                {availability.slice(0, 18).map((slot) => (
                  <button className="secondary" disabled={isBusy} key={slot.startAt} onClick={() => createBooking(slot)} type="button">
                    {formatTime(slot.startAt)}
                  </button>
                ))}
              </div>
            )}
          </form>

          <aside className="history-panel">
            <div className="panel-heading">
              <h2>ประวัติการจอง</h2>
              <button className="secondary" disabled={isBusy} onClick={refreshCustomerData} type="button">
                Refresh
              </button>
            </div>

            <div className="queue-list">
              {myBookings.length === 0 ? (
                <p className="empty-state">ยังไม่มีประวัติการจอง</p>
              ) : (
                myBookings.map((booking) => (
                  <article className="queue-item" key={booking.id}>
                    <button type="button">
                      <span className="booking-time">{formatDateTime(booking.startAt)}</span>
                      <span>
                        <strong>{booking.barberName}</strong>
                        <small>{booking.bookingNumber}</small>
                      </span>
                      <span className={`status-pill status-${booking.bookingStatus}`}>{statusLabels[booking.bookingStatus]}</span>
                    </button>
                    {booking.bookingStatus === 'Completed' && (
                      <div className="inline-actions">
                        <button className="secondary" disabled={isBusy} onClick={() => loadCustomerReceipt(booking)} type="button">
                          ดูใบเสร็จ
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>

            {customerReceipt && <ReceiptBox receipt={customerReceipt} />}
          </aside>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <Header auth={auth} eyebrow="Staff Dashboard" onLogout={logout} />

      <nav className="tabs">
        <button className={activeStaffPanel === 'queue' ? 'active' : ''} onClick={() => setActiveStaffPanel('queue')} type="button">
          คิววันนี้
        </button>
        <button
          className={activeStaffPanel === 'accounts' ? 'active' : ''}
          onClick={() => setActiveStaffPanel('accounts')}
          type="button"
        >
          บัญชีรับเงิน
        </button>
        {canManageStaff && (
          <button className={activeStaffPanel === 'staff' ? 'active' : ''} onClick={() => setActiveStaffPanel('staff')} type="button">
            พนักงาน
          </button>
        )}
      </nav>

      {message && <p className="notice">{message}</p>}

      {activeStaffPanel === 'queue' ? (
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

                <ServiceList services={selectedBooking.services} />

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

                {staffReceipt && <ReceiptBox receipt={staffReceipt} />}
              </>
            ) : (
              <p className="empty-state">เลือกคิวเพื่อดูรายละเอียด</p>
            )}
          </aside>
        </section>
      ) : activeStaffPanel === 'accounts' ? (
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
      ) : (
        <section className="accounts-grid">
          <form className="account-form" onSubmit={saveStaffAccount}>
            <h2>เพิ่มพนักงาน</h2>
            <label>
              ชื่อ-นามสกุล
              <input value={staffForm.fullName} onChange={(event) => setStaffForm({ ...staffForm, fullName: event.target.value })} />
            </label>
            <label>
              ชื่อเล่น
              <input value={staffForm.nickname} onChange={(event) => setStaffForm({ ...staffForm, nickname: event.target.value })} />
            </label>
            <label>
              เบอร์โทร
              <input value={staffForm.phoneNumber} onChange={(event) => setStaffForm({ ...staffForm, phoneNumber: event.target.value })} />
            </label>
            <label>
              Email
              <input value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} />
            </label>
            <label>
              Password เริ่มต้น
              <PasswordInput
                isVisible={isStaffPasswordVisible}
                onChange={(value) => setStaffForm({ ...staffForm, password: value })}
                onToggleVisibility={() => setIsStaffPasswordVisible((current) => !current)}
                value={staffForm.password}
              />
              <small>รหัสนี้ใช้ให้พนักงาน login ครั้งแรก เจ้าของร้านแก้ก่อนสร้างบัญชีได้</small>
            </label>
            <label>
              Role
              <select
                value={staffForm.role}
                onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value as 'Barber' | 'FrontDeskStaff' })}
              >
                <option value="Barber">Barber</option>
                <option value="FrontDeskStaff">Front Desk Staff</option>
              </select>
            </label>
            <label>
              วันเริ่มงาน
              <input
                type="date"
                value={staffForm.startDate}
                onChange={(event) => setStaffForm({ ...staffForm, startDate: event.target.value })}
              />
            </label>

            {staffForm.role === 'Barber' && (
              <>
                <label>
                  ความถนัด
                  <input value={staffForm.specialty} onChange={(event) => setStaffForm({ ...staffForm, specialty: event.target.value })} />
                </label>
                <label>
                  ประสบการณ์ (ปี)
                  <input
                    min="0"
                    type="number"
                    value={staffForm.experienceYears}
                    onChange={(event) => setStaffForm({ ...staffForm, experienceYears: event.target.value })}
                  />
                </label>
                <label>
                  Bio
                  <input value={staffForm.bio} onChange={(event) => setStaffForm({ ...staffForm, bio: event.target.value })} />
                </label>
                <label className="checkbox-label">
                  <input
                    checked={staffForm.isAvailable}
                    onChange={(event) => setStaffForm({ ...staffForm, isAvailable: event.target.checked })}
                    type="checkbox"
                  />
                  พร้อมให้บริการ
                </label>
                <label className="checkbox-label">
                  <input
                    checked={staffForm.acceptsBooking}
                    onChange={(event) => setStaffForm({ ...staffForm, acceptsBooking: event.target.checked })}
                    type="checkbox"
                  />
                  รับจองออนไลน์
                </label>
              </>
            )}

            <label>
              หมายเหตุ
              <input value={staffForm.note} onChange={(event) => setStaffForm({ ...staffForm, note: event.target.value })} />
            </label>
            <button disabled={isBusy} type="submit">
              สร้างบัญชีพนักงาน
            </button>
          </form>

          <div className="account-list">
            <div className="panel-heading">
              <h2>รายชื่อพนักงาน</h2>
              <button disabled={isBusy} onClick={refreshStaffAccounts} type="button">
                Refresh
              </button>
            </div>

            {staffAccounts.length === 0 ? (
              <p className="empty-state">ยังไม่มีบัญชีพนักงาน</p>
            ) : (
              staffAccounts.map((staff) => (
                <article className="account-card" key={staff.id}>
                  <div>
                    <strong>{staff.fullName}</strong>
                    <span>{staff.role}</span>
                    <small>{staff.email}</small>
                    <small>{staff.phoneNumber}</small>
                    {staff.role === 'Barber' && (
                      <small>
                        {staff.specialty ?? 'ยังไม่ระบุความถนัด'} / {staff.acceptsBooking ? 'รับจองออนไลน์' : 'ไม่รับจองออนไลน์'}
                      </small>
                    )}
                  </div>
                  <div className="account-actions">
                    <span className={staff.accountStatus === 'Active' ? 'status-pill' : 'status-pill muted-pill'}>
                      {staff.accountStatus}
                    </span>
                    {staff.accountStatus === 'Active' ? (
                      <button
                        className="secondary"
                        disabled={isBusy}
                        onClick={() => updateStaffStatus(staff, 'Disabled')}
                        type="button"
                      >
                        ปิดใช้งาน
                      </button>
                    ) : (
                      <button
                        className="secondary"
                        disabled={isBusy}
                        onClick={() => updateStaffStatus(staff, 'Active')}
                        type="button"
                      >
                        เปิดใช้งาน
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </main>
  )
}

function PasswordInput({
  isVisible,
  onChange,
  onToggleVisibility,
  placeholder,
  value,
}: {
  isVisible: boolean
  onChange: (value: string) => void
  onToggleVisibility: () => void
  placeholder?: string
  value: string
}) {
  return (
    <div className="password-input-row">
      <input
        placeholder={placeholder}
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button className="secondary" onClick={onToggleVisibility} type="button">
        {isVisible ? 'ซ่อน' : 'ดู'}
      </button>
    </div>
  )
}

function Header({
  auth,
  eyebrow,
  onLogout,
}: {
  auth: AuthResponse
  eyebrow: string
  onLogout: () => void
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>Rodeo Barber Shop</h1>
      </div>
      <div className="user-box">
        <span>{auth.fullName}</span>
        <strong>{auth.role}</strong>
        <button onClick={onLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  )
}

function ServiceList({ services }: { services: BookingService[] }) {
  return (
    <div className="service-list">
      {services.map((service) => (
        <div key={service.serviceId}>
          <span>{service.serviceName}</span>
          <strong>{formatMoney(service.lineTotal)}</strong>
        </div>
      ))}
    </div>
  )
}

function ReceiptBox({ receipt }: { receipt: Receipt }) {
  return (
    <section className="receipt-box">
      <h3>ใบเสร็จ</h3>
      <p>{receipt.paymentNumber}</p>
      <p>{receipt.shopName}</p>
      <small>
        {receipt.customerName} / {receipt.barberName} / {formatDateTime(receipt.paidAt)}
      </small>
      <ServiceList services={receipt.services} />
      <strong>{formatMoney(receipt.totalAmount)}</strong>
    </section>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value))
}

function getTomorrowDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)

  return date.toISOString().slice(0, 10)
}

export default App
