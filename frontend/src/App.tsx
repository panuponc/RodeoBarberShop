import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
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

type BarberWorkingHour = {
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorkingDay: boolean
}

type BarberSchedule = {
  barberId: string
  fullName: string
  workingHours: BarberWorkingHour[]
}

type ScheduleBarber = {
  barber: Barber
  isWorkingToday: boolean
  workingHour?: BarberWorkingHour
}

type ScheduleChair = {
  id: string
  title: string
  meta: string
  subtitle: string
  order: number
  isShared: boolean
  hasSubstitute: boolean
  isWorkingToday: boolean
  workingHours: BarberWorkingHour[]
  barbers: ScheduleBarber[]
}

type ChairConfig = {
  id: string
  label: string
  note: string
  order: number
  barberNames: string[]
}

const chairConfigs: ChairConfig[] = [
  { id: 'chair-1', label: 'เก้าอี้ 1', note: 'ติดกระจก', order: 1, barberNames: ['ช่างเค๊ก'] },
  { id: 'chair-2', label: 'เก้าอี้ 2', note: 'เก้าอี้ประจำ', order: 2, barberNames: ['ช่างบั้ม'] },
  { id: 'chair-3', label: 'เก้าอี้ 3', note: 'ช่างนุ้ยจองล่วงหน้า 1 วัน', order: 3, barberNames: ['ช่างนุค', 'ช่างนุ้ย'] },
  { id: 'chair-4', label: 'เก้าอี้ 4', note: 'เก้าอี้ประจำ', order: 4, barberNames: ['ช่างเปิ้ล'] },
  { id: 'chair-5', label: 'เก้าอี้ 5', note: 'หน้าทีวี', order: 5, barberNames: ['ช่างเดียว'] },
]

const scheduleTimelineStartHour = 10
const scheduleTimelineEndHour = 21
const scheduleTimelineMinutes = (scheduleTimelineEndHour - scheduleTimelineStartHour) * 60
const scheduleHourHeightPx = 96

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
  barberId: string | null
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

const previousStatus: Record<string, string> = {
  Confirmed: 'PendingConfirmation',
  WaitingService: 'Confirmed',
  InService: 'WaitingService',
  WaitingPayment: 'InService',
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
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [editStaffForm, setEditStaffForm] = useState({
    fullName: '',
    nickname: '',
    phoneNumber: '',
    role: 'Barber' as 'Barber' | 'FrontDeskStaff',
    accountStatus: 'Active',
    startDate: '',
    note: '',
    specialty: '',
    experienceYears: '',
    bio: '',
    isAvailable: true,
    acceptsBooking: true,
  })
  const [resetPasswordStaffId, setResetPasswordStaffId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('StaffPassword123!')
  const [isStaffPasswordVisible, setIsStaffPasswordVisible] = useState(false)
  const [isResetPasswordVisible, setIsResetPasswordVisible] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [barberSchedules, setBarberSchedules] = useState<Record<string, BarberSchedule>>({})
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [bookingDate, setBookingDate] = useState(getTomorrowDate())
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [customerReceipt, setCustomerReceipt] = useState<Receipt | null>(null)
  const [isStaffBookingFormOpen, setIsStaffBookingFormOpen] = useState(false)
  const staffBookingFormRef = useRef<HTMLFormElement | null>(null)
  const [scheduleDate, setScheduleDate] = useState(getTodayDate())
  const [staffBookingContext, setStaffBookingContext] = useState('')
  const [staffBookingBarberOptions, setStaffBookingBarberOptions] = useState<string[]>([])
  const [staffBookingForm, setStaffBookingForm] = useState({
    guestName: '',
    guestPhoneNumber: '',
    guestEmail: '',
    barberId: '',
    startAt: getDefaultBookingDateTime(getTodayDate()),
    serviceIds: [] as string[],
    customerNote: '',
  })

  const defaultPaymentAccount = useMemo(
    () => paymentAccounts.find((account) => account.isActive && account.isDefault),
    [paymentAccounts],
  )

  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id))
  const selectedTotal = selectedServices.reduce((total, service) => total + service.price, 0)
  const canManageStaff = auth?.role === 'Owner' || auth?.role === 'Admin'
  const staffBookingBarberOptionSet = new Set(staffBookingBarberOptions)
  const staffBookingSelectableBarbers = staffBookingBarberOptions.length > 0
    ? barbers.filter((barber) => staffBookingBarberOptionSet.has(barber.id))
    : barbers
  const scheduleChairs = useMemo(
    () => getScheduleChairsForDate(barbers, barberSchedules, scheduleDate),
    [barberSchedules, barbers, scheduleDate],
  )
  const staffPanelTitle =
    activeStaffPanel === 'queue' ? 'จัดการคิววันนี้' : activeStaffPanel === 'accounts' ? 'บัญชีรับเงินร้าน' : 'จัดการพนักงาน'
  const queueSummary = {
    total: queue.length,
    confirmed: queue.filter((booking) => booking.bookingStatus === 'Confirmed' || booking.bookingStatus === 'WaitingService').length,
    inProgress: queue.filter((booking) => booking.bookingStatus === 'InService' || booking.bookingStatus === 'WaitingPayment').length,
    completed: queue.filter((booking) => booking.bookingStatus === 'Completed').length,
    pending: queue.filter((booking) => booking.bookingStatus === 'PendingConfirmation').length,
    revenue: queue
      .filter((booking) => booking.paymentStatus === 'Paid' || booking.bookingStatus === 'Completed')
      .reduce((total, booking) => total + booking.totalAmount, 0),
  }

  useEffect(() => {
    if (!auth) return

    if (auth.role === 'Customer') {
      void refreshCustomerData()
    } else {
      void refreshQueue(scheduleDate)
      void refreshBarbers()
      void refreshServices()
      void refreshPaymentAccounts()
      if (auth.role === 'Owner' || auth.role === 'Admin') {
        void refreshStaffAccounts()
      }
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  useEffect(() => {
    if (!auth || auth.role === 'Customer') return

    void refreshQueue(scheduleDate)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleDate])

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
      const sortedBarbers = sortBarbersByChair(barberResult)
      setBarbers(sortedBarbers)
      await refreshBarberSchedules(sortedBarbers)
      setMyBookings(bookingResult)
      setSelectedBarberId((current) => current || sortedBarbers[0]?.id || '')
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

  async function refreshQueue(targetDate = scheduleDate) {
    try {
      const result = await api<Booking[]>(`/api/queue?date=${targetDate}`)
      setQueue(result)
      setSelectedBooking((current) => current && result.some((booking) => booking.id === current.id) ? current : null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดคิวไม่สำเร็จ')
    }
  }

  async function refreshBarbers() {
    try {
      const result = await api<Barber[]>('/api/barbers')
      const sortedBarbers = sortBarbersByChair(result)
      setBarbers(sortedBarbers)
      await refreshBarberSchedules(sortedBarbers)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดรายชื่อช่างไม่สำเร็จ')
    }
  }

  async function refreshBarberSchedules(targetBarbers: Barber[]) {
    const schedules = await Promise.all(
      targetBarbers.map((barber) => api<BarberSchedule>(`/api/barbers/${barber.id}/schedule`)),
    )

    setBarberSchedules(Object.fromEntries(schedules.map((schedule) => [schedule.barberId, schedule])))
  }

  async function refreshServices() {
    try {
      const result = await api<Service[]>('/api/services')
      setServices(result)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดบริการไม่สำเร็จ')
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

  async function moveStatus(booking: Booking, targetStatus = nextStatus[booking.bookingStatus]) {
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

  function startEditingStaff(staff: StaffAccount) {
    setEditingStaffId(staff.id)
    setResetPasswordStaffId(null)
    setEditStaffForm({
      fullName: staff.fullName,
      nickname: staff.nickname ?? '',
      phoneNumber: staff.phoneNumber,
      role: staff.role,
      accountStatus: staff.accountStatus,
      startDate: staff.startDate ?? '',
      note: staff.note ?? '',
      specialty: staff.specialty ?? '',
      experienceYears: staff.experienceYears?.toString() ?? '',
      bio: staff.bio ?? '',
      isAvailable: staff.isAvailable,
      acceptsBooking: staff.acceptsBooking,
    })
  }

  async function saveStaffEdit(event: FormEvent<HTMLFormElement>, staff: StaffAccount) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      await api(`/api/staff/${staff.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: editStaffForm.fullName,
          nickname: editStaffForm.nickname || null,
          phoneNumber: editStaffForm.phoneNumber,
          role: editStaffForm.role,
          accountStatus: editStaffForm.accountStatus,
          startDate: editStaffForm.startDate || null,
          note: editStaffForm.note || null,
          specialty: editStaffForm.specialty || null,
          experienceYears: editStaffForm.experienceYears ? Number(editStaffForm.experienceYears) : null,
          bio: editStaffForm.bio || null,
          isAvailable: editStaffForm.role === 'Barber' ? editStaffForm.isAvailable : false,
          acceptsBooking: editStaffForm.role === 'Barber' ? editStaffForm.acceptsBooking : false,
        }),
      })

      setEditingStaffId(null)
      await refreshStaffAccounts()
      setMessage('บันทึกข้อมูลพนักงานแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกข้อมูลพนักงานไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function saveStaffPassword(event: FormEvent<HTMLFormElement>, staff: StaffAccount) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      await api(`/api/staff/${staff.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: resetPassword }),
      })

      setResetPasswordStaffId(null)
      setResetPassword('StaffPassword123!')
      setMessage(`Reset password ให้ ${staff.fullName} แล้ว`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reset password ไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function createStaffBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      if (!staffBookingForm.barberId || staffBookingForm.serviceIds.length === 0) {
        throw new Error('กรุณาเลือกช่างและบริการ')
      }

      if (new Date(staffBookingForm.startAt) <= new Date()) {
        throw new Error('กรุณาเลือกวันเวลาในอนาคต')
      }

      await api<Booking>('/api/bookings/staff', {
        method: 'POST',
        body: JSON.stringify({
          guestName: staffBookingForm.guestName,
          guestPhoneNumber: staffBookingForm.guestPhoneNumber,
          guestEmail: staffBookingForm.guestEmail || null,
          barberId: staffBookingForm.barberId,
          startAt: new Date(staffBookingForm.startAt).toISOString(),
          serviceIds: staffBookingForm.serviceIds,
          customerNote: staffBookingForm.customerNote || null,
        }),
      })

      const createdBookingDate = staffBookingForm.startAt.slice(0, 10)
      setIsStaffBookingFormOpen(false)
      setStaffBookingContext('')
      setStaffBookingBarberOptions([])
      setStaffBookingForm({
        guestName: '',
        guestPhoneNumber: '',
        guestEmail: '',
        barberId: staffBookingForm.barberId,
        startAt: getDefaultBookingDateTime(createdBookingDate),
        serviceIds: [],
        customerNote: '',
      })
      setScheduleDate(createdBookingDate)
      await refreshQueue(createdBookingDate)
      setSelectedBooking(null)
      setPaymentSummary(null)
      setStaffReceipt(null)
      setMessage('เพิ่มการนัดหมายแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เพิ่มการนัดหมายไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  function openStaffBookingFormForChair(chair: ScheduleChair) {
    const defaultBookingDate = clampDateToToday(scheduleDate)
    const workingChairBarbers = chair.barbers.filter((item) => item.isWorkingToday)
    const optionIds = workingChairBarbers.map((item) => item.barber.id)
    const defaultBarberId = optionIds.length === 1
      ? optionIds[0]
      : optionIds.includes(staffBookingForm.barberId)
        ? staffBookingForm.barberId
        : optionIds[0] ?? ''

    setStaffBookingForm((current) => ({
      ...current,
      barberId: defaultBarberId,
      startAt: current.startAt.slice(0, 10) === defaultBookingDate
        ? current.startAt
        : getDefaultBookingDateTime(defaultBookingDate),
    }))
    setStaffBookingContext(`${chair.title} / ${chair.meta}`)
    setStaffBookingBarberOptions(optionIds)
    setIsStaffBookingFormOpen(true)
  }

  function closeStaffBookingForm() {
    setIsStaffBookingFormOpen(false)
    setStaffBookingContext('')
    setStaffBookingBarberOptions([])
  }

  function openBookingDetail(booking: Booking) {
    setSelectedBooking(booking)
    setPaymentSummary(null)
    setStaffReceipt(null)
  }

  function closeBookingDetail() {
    setSelectedBooking(null)
    setPaymentSummary(null)
    setStaffReceipt(null)
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
              <input
                min={getTodayDate()}
                value={bookingDate}
                onChange={(event) => setBookingDate(clampDateToToday(event.target.value))}
                type="date"
              />
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
    <main className="backoffice-shell">
      <aside className="backoffice-sidebar">
        <div className="brand-block">
          <strong>Rodeo</strong>
          <span>Barber Shop</span>
        </div>

        <nav className="side-nav">
          <button className={activeStaffPanel === 'queue' ? 'active' : ''} onClick={() => setActiveStaffPanel('queue')} type="button">
            <span>⌂</span>
            คิววันนี้
          </button>
          <button
            className={activeStaffPanel === 'accounts' ? 'active' : ''}
            onClick={() => setActiveStaffPanel('accounts')}
            type="button"
          >
            <span>฿</span>
            บัญชีรับเงิน
          </button>
          {canManageStaff && (
            <button className={activeStaffPanel === 'staff' ? 'active' : ''} onClick={() => setActiveStaffPanel('staff')} type="button">
              <span>◎</span>
              พนักงาน
            </button>
          )}
        </nav>

        <div className="shop-card">
          <strong>Rodeo Barber Shop</strong>
          <small>เปิดร้าน 10:00 - 20:00</small>
          <small>ระบบหลังบ้าน</small>
        </div>
      </aside>

      <section className="backoffice-main">
        <header className="backoffice-header">
          <div>
            <p className="eyebrow">Back Office</p>
            <h1>{staffPanelTitle}</h1>
          </div>
          <div className="backoffice-user">
            <div>
              <strong>{auth.fullName}</strong>
              <small>{auth.role}</small>
              {message && <small className="session-message">{message}</small>}
            </div>
            <button className="secondary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </header>

        {activeStaffPanel === 'queue' ? (
        <section className="schedule-layout">
          <div className="schedule-board-panel">
            <div className="schedule-toolbar">
              <div className="schedule-toolbar-actions">
                <div className="schedule-date-controls">
                  <button className="secondary schedule-nav-button" aria-label="ก่อนหน้า" onClick={() => setScheduleDate(addDays(scheduleDate, -1))} type="button">
                    ←
                  </button>
                  <label className="schedule-date-picker">
                    <span>{formatToolbarDate(parseLocalDate(scheduleDate))}</span>
                    <input
                      aria-label="เลือกวันที่ตารางงาน"
                      type="date"
                      value={scheduleDate}
                      onChange={(event) => setScheduleDate(event.target.value)}
                    />
                  </label>
                  <button className="secondary schedule-nav-button" aria-label="ถัดไป" onClick={() => setScheduleDate(addDays(scheduleDate, 1))} type="button">
                    →
                  </button>
                  <button className="secondary" onClick={() => setScheduleDate(getTodayDate())} type="button">
                    วันนี้
                  </button>
                </div>
                <div className="schedule-primary-actions">
                  <button className="secondary" disabled={isBusy} onClick={() => {
                    void refreshQueue(scheduleDate)
                    void refreshBarbers()
                    void refreshServices()
                  }} type="button">
                    Refresh
                  </button>
                  <button className="primary-action" onClick={() => {
                    const defaultBookingDate = clampDateToToday(scheduleDate)
                    setStaffBookingContext('')
                    setStaffBookingBarberOptions([])
                    setStaffBookingForm((current) => ({
                      ...current,
                      startAt: current.startAt.slice(0, 10) === defaultBookingDate
                        ? current.startAt
                        : getDefaultBookingDateTime(defaultBookingDate),
                    }))
                    setIsStaffBookingFormOpen((current) => !current)
                  }} type="button">
                    {isStaffBookingFormOpen ? 'ปิดฟอร์ม' : '+ เพิ่มการนัดหมาย'}
                  </button>
                </div>
              </div>
            </div>

            <div
              className="schedule-board"
              style={getScheduleBoardGridStyle(scheduleChairs)}
            >
              {barbers.length === 0 ? (
                <p className="empty-state">ยังไม่มีช่างที่เปิดรับจองออนไลน์</p>
              ) : (
                <>
                  <ScheduleTimeColumn />
                  {scheduleChairs.map((chair) => (
                    <ChairScheduleColumn
                      bookings={queue.filter((booking) => chair.barbers.some(({ barber }) => booking.barberId === barber.id))}
                      chair={chair}
                      key={chair.id}
                      onCreateBooking={openStaffBookingFormForChair}
                      onSelectBooking={openBookingDetail}
                      selectedBookingId={selectedBooking?.id}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {isStaffBookingFormOpen && (
            <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeStaffBookingForm()
              }
            }}>
              <form className="staff-booking-form booking-modal" onSubmit={createStaffBooking} ref={staffBookingFormRef}>
                <div className="booking-modal-header">
                  <div>
                    <p className="eyebrow">เพิ่มการจองคิว</p>
                    <h3>จองคิวหน้าร้าน</h3>
                  </div>
                  <button className="secondary" onClick={closeStaffBookingForm} type="button">
                    ปิด
                  </button>
                </div>

                {staffBookingContext && (
                  <div className="staff-booking-context">
                    <span>กำลังเพิ่มคิวให้</span>
                    <strong>{staffBookingContext}</strong>
                  </div>
                )}
                <label>
                  ชื่อลูกค้า
                  <input
                    value={staffBookingForm.guestName}
                    onChange={(event) => setStaffBookingForm({ ...staffBookingForm, guestName: event.target.value })}
                  />
                </label>
                <label>
                  เบอร์โทร
                  <input
                    value={staffBookingForm.guestPhoneNumber}
                    onChange={(event) => setStaffBookingForm({ ...staffBookingForm, guestPhoneNumber: event.target.value })}
                  />
                </label>
                <label>
                  Email
                  <input
                    value={staffBookingForm.guestEmail}
                    onChange={(event) => setStaffBookingForm({ ...staffBookingForm, guestEmail: event.target.value })}
                  />
                </label>
                <label>
                  ช่าง
                  <select
                    disabled={staffBookingBarberOptions.length === 1}
                    value={staffBookingForm.barberId}
                    onChange={(event) => setStaffBookingForm({ ...staffBookingForm, barberId: event.target.value })}
                  >
                    <option value="">เลือกช่าง</option>
                    {staffBookingSelectableBarbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {getBarberBookingLabel(barber)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  วันเวลา
                  <input
                    min={getMinimumStaffBookingDateTime(staffBookingForm.startAt.slice(0, 10))}
                    type="datetime-local"
                    value={staffBookingForm.startAt}
                    onChange={(event) => setStaffBookingForm({
                      ...staffBookingForm,
                      startAt: clampDateTimeToMinimum(event.target.value),
                    })}
                  />
                </label>
                <label>
                  หมายเหตุ
                  <input
                    value={staffBookingForm.customerNote}
                    onChange={(event) => setStaffBookingForm({ ...staffBookingForm, customerNote: event.target.value })}
                  />
                </label>

                <div className="staff-booking-services">
                  <strong>บริการ</strong>
                  {services.length === 0 ? (
                    <small>ยังไม่มีบริการ active</small>
                  ) : (
                    services.map((service) => (
                      <label className="checkbox-label" key={service.id}>
                        <input
                          checked={staffBookingForm.serviceIds.includes(service.id)}
                          onChange={(event) => {
                            setStaffBookingForm((current) => ({
                              ...current,
                              serviceIds: event.target.checked
                                ? [...current.serviceIds, service.id]
                                : current.serviceIds.filter((serviceId) => serviceId !== service.id),
                            }))
                          }}
                          type="checkbox"
                        />
                        {service.name} / {service.durationMinutes} นาที / {formatMoney(service.price)}
                      </label>
                    ))
                  )}
                </div>

                <div className="action-row">
                  <button disabled={isBusy} type="submit">
                    บันทึกการนัดหมาย
                  </button>
                  <button className="secondary" onClick={closeStaffBookingForm} type="button">
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          )}

          <aside className="detail-panel schedule-detail-panel">
            <section className="schedule-side-summary">
              <h3>สรุปวันที่เลือก</h3>
              <div>
                <span>คิวทั้งหมด</span>
                <strong>{queueSummary.total}</strong>
              </div>
              <div>
                <span>รอยืนยัน</span>
                <strong>{queueSummary.pending}</strong>
              </div>
              <div>
                <span>ยืนยันแล้ว</span>
                <strong>{queueSummary.confirmed}</strong>
              </div>
              <div>
                <span>กำลังให้บริการ/รอชำระ</span>
                <strong>{queueSummary.inProgress}</strong>
              </div>
              <div>
                <span>เสร็จแล้ว</span>
                <strong>{queueSummary.completed}</strong>
              </div>
              <div>
                <span>รายได้ที่รับแล้ว</span>
                <strong>{formatMoney(queueSummary.revenue)}</strong>
              </div>
            </section>

            <section className="status-legend">
              <h3>สถานะคิว</h3>
              <span><i className="legend-dot pending" /> รอยืนยัน</span>
              <span><i className="legend-dot confirmed" /> ยืนยัน/มาถึงร้าน</span>
              <span><i className="legend-dot progress" /> กำลังให้บริการ</span>
              <span><i className="legend-dot payment" /> รอชำระเงิน</span>
              <span><i className="legend-dot done" /> เสร็จสิ้น</span>
            </section>
          </aside>

          {selectedBooking && (
            <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeBookingDetail()
              }
            }}>
              <article className="detail-panel booking-detail-modal" role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
                <div className="booking-detail-header">
                  <div>
                    <span className="modal-eyebrow">รายละเอียดคิว</span>
                    <h2 id="booking-detail-title">{selectedBooking.customerName ?? 'Walk-in customer'}</h2>
                    <small>{selectedBooking.bookingNumber}</small>
                  </div>
                  <div className="booking-detail-header-actions">
                    <span className={`status-pill status-${selectedBooking.bookingStatus}`}>
                      {statusLabels[selectedBooking.bookingStatus]}
                    </span>
                    <button className="icon-button" aria-label="ปิดรายละเอียดคิว" onClick={closeBookingDetail} type="button">
                      ×
                    </button>
                  </div>
                </div>

                <dl className="booking-detail-grid">
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
                  <div>
                    <dt>ระยะเวลา</dt>
                    <dd>
                      {selectedBooking.services.reduce((total, service) => total + service.durationMinutes * service.quantity, 0)} นาที
                    </dd>
                  </div>
                </dl>

                <section className="booking-detail-services">
                  <div className="booking-detail-section-title">
                    <h3>บริการที่เลือก</h3>
                    <span>{selectedBooking.services.length} รายการ</span>
                  </div>
                  <ServiceList services={selectedBooking.services} />
                </section>

                <div className="booking-detail-actions">
                  {previousStatus[selectedBooking.bookingStatus] && (
                    <button
                      className="secondary status-back-button"
                      disabled={isBusy}
                      onClick={() => moveStatus(selectedBooking, previousStatus[selectedBooking.bookingStatus])}
                      type="button"
                    >
                      ย้อนกลับเป็น {statusLabels[previousStatus[selectedBooking.bookingStatus]]}
                    </button>
                  )}
                  {nextStatus[selectedBooking.bookingStatus] && (
                    <button className="status-next-button" disabled={isBusy} onClick={() => moveStatus(selectedBooking)} type="button">
                      เปลี่ยนเป็น {statusLabels[nextStatus[selectedBooking.bookingStatus]]}
                    </button>
                  )}
                  {selectedBooking.bookingStatus === 'WaitingPayment' && (
                    <button className="status-next-button" disabled={isBusy} onClick={() => loadPaymentSummary(selectedBooking)} type="button">
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
              </article>
            </div>
          )}
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
        <section className="accounts-grid staff-management-grid">
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
                  <div className="staff-card-summary">
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
                      <button className="secondary" disabled={isBusy} onClick={() => startEditingStaff(staff)} type="button">
                        แก้ไข
                      </button>
                      <button
                        className="secondary"
                        disabled={isBusy}
                        onClick={() => {
                          setResetPasswordStaffId(resetPasswordStaffId === staff.id ? null : staff.id)
                          setEditingStaffId(null)
                          setResetPassword('StaffPassword123!')
                        }}
                        type="button"
                      >
                        Reset Password
                      </button>
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
                  </div>

                  {editingStaffId === staff.id && (
                    <form className="inline-staff-form" onSubmit={(event) => saveStaffEdit(event, staff)}>
                      <label>
                        ชื่อ-นามสกุล
                        <input
                          value={editStaffForm.fullName}
                          onChange={(event) => setEditStaffForm({ ...editStaffForm, fullName: event.target.value })}
                        />
                      </label>
                      <label>
                        ชื่อเล่น
                        <input
                          value={editStaffForm.nickname}
                          onChange={(event) => setEditStaffForm({ ...editStaffForm, nickname: event.target.value })}
                        />
                      </label>
                      <label>
                        เบอร์โทร
                        <input
                          value={editStaffForm.phoneNumber}
                          onChange={(event) => setEditStaffForm({ ...editStaffForm, phoneNumber: event.target.value })}
                        />
                      </label>
                      <label>
                        Role
                        <select
                          value={editStaffForm.role}
                          onChange={(event) =>
                            setEditStaffForm({ ...editStaffForm, role: event.target.value as 'Barber' | 'FrontDeskStaff' })
                          }
                        >
                          <option value="Barber">Barber</option>
                          <option value="FrontDeskStaff">Front Desk Staff</option>
                        </select>
                      </label>
                      <label>
                        สถานะบัญชี
                        <select
                          value={editStaffForm.accountStatus}
                          onChange={(event) => setEditStaffForm({ ...editStaffForm, accountStatus: event.target.value })}
                        >
                          <option value="Active">Active</option>
                          <option value="Disabled">Disabled</option>
                          <option value="Suspended">Suspended</option>
                          <option value="Resigned">Resigned</option>
                        </select>
                      </label>
                      <label>
                        วันเริ่มงาน
                        <input
                          type="date"
                          value={editStaffForm.startDate}
                          onChange={(event) => setEditStaffForm({ ...editStaffForm, startDate: event.target.value })}
                        />
                      </label>

                      {editStaffForm.role === 'Barber' && (
                        <>
                          <label>
                            ความถนัด
                            <input
                              value={editStaffForm.specialty}
                              onChange={(event) => setEditStaffForm({ ...editStaffForm, specialty: event.target.value })}
                            />
                          </label>
                          <label>
                            ประสบการณ์ (ปี)
                            <input
                              min="0"
                              type="number"
                              value={editStaffForm.experienceYears}
                              onChange={(event) => setEditStaffForm({ ...editStaffForm, experienceYears: event.target.value })}
                            />
                          </label>
                          <label>
                            Bio
                            <input value={editStaffForm.bio} onChange={(event) => setEditStaffForm({ ...editStaffForm, bio: event.target.value })} />
                          </label>
                          <label className="checkbox-label">
                            <input
                              checked={editStaffForm.isAvailable}
                              onChange={(event) => setEditStaffForm({ ...editStaffForm, isAvailable: event.target.checked })}
                              type="checkbox"
                            />
                            พร้อมให้บริการ
                          </label>
                          <label className="checkbox-label">
                            <input
                              checked={editStaffForm.acceptsBooking}
                              onChange={(event) => setEditStaffForm({ ...editStaffForm, acceptsBooking: event.target.checked })}
                              type="checkbox"
                            />
                            รับจองออนไลน์
                          </label>
                        </>
                      )}

                      <label>
                        หมายเหตุ
                        <input value={editStaffForm.note} onChange={(event) => setEditStaffForm({ ...editStaffForm, note: event.target.value })} />
                      </label>
                      <div className="action-row">
                        <button disabled={isBusy} type="submit">
                          บันทึก
                        </button>
                        <button className="secondary" onClick={() => setEditingStaffId(null)} type="button">
                          ยกเลิก
                        </button>
                      </div>
                    </form>
                  )}

                  {resetPasswordStaffId === staff.id && (
                    <form className="inline-staff-form compact" onSubmit={(event) => saveStaffPassword(event, staff)}>
                      <label>
                        Password ใหม่
                        <PasswordInput
                          isVisible={isResetPasswordVisible}
                          onChange={setResetPassword}
                          onToggleVisibility={() => setIsResetPasswordVisible((current) => !current)}
                          value={resetPassword}
                        />
                      </label>
                      <div className="action-row">
                        <button disabled={isBusy} type="submit">
                          บันทึก Password ใหม่
                        </button>
                        <button className="secondary" onClick={() => setResetPasswordStaffId(null)} type="button">
                          ยกเลิก
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
        )}
      </section>
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

function ScheduleTimeColumn() {
  return (
    <aside className="schedule-time-column" aria-label="เวลา">
      <div className="schedule-time-column-header">เวลา</div>
      <div className="schedule-time-axis">
        {Array.from({ length: scheduleTimelineEndHour - scheduleTimelineStartHour + 1 }, (_, index) => {
          const hour = scheduleTimelineStartHour + index

          return (
            <span key={hour} style={{ top: `${index * scheduleHourHeightPx + 6}px` }}>
              {String(hour).padStart(2, '0')}:00
            </span>
          )
        })}
      </div>
    </aside>
  )
}

function ChairScheduleColumn({
  bookings,
  chair,
  onCreateBooking,
  onSelectBooking,
  selectedBookingId,
}: {
  chair: ScheduleChair
  bookings: Booking[]
  onCreateBooking: (chair: ScheduleChair) => void
  onSelectBooking: (booking: Booking) => void
  selectedBookingId?: string
}) {
  const sortedBookings = [...bookings].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())
  const columnClassName = [
    'barber-column',
    chair.isWorkingToday ? '' : 'off-day',
    chair.isShared ? 'shared-chair' : '',
  ].filter(Boolean).join(' ')

  return (
    <article className={columnClassName}>
      <header className="barber-column-header">
        <div className="barber-avatar-wrap">
          <div className="barber-avatar">{getInitials(chair.title)}</div>
          <span className={chair.isWorkingToday ? 'availability-dot available' : 'availability-dot'} />
        </div>
        <div>
          <strong>{chair.title}</strong>
          <small>
            {chair.isWorkingToday ? (
              <>
                <span>{chair.meta}</span>
                <span className="chair-note">
                  <span>{chair.subtitle}</span>
                </span>
              </>
            ) : (
              'ไม่อยู่ร้านวันนี้'
            )}
          </small>
        </div>
      </header>

      {chair.isWorkingToday && (
        <button className="schedule-add-booking" onClick={() => onCreateBooking(chair)} type="button">
          + จองคิว
        </button>
      )}

      <div className="barber-column-body">
        <div className="schedule-timeline">
          <div className="schedule-hour-lines" aria-hidden="true">
            {Array.from({ length: scheduleTimelineEndHour - scheduleTimelineStartHour + 1 }, (_, index) => (
              <span key={scheduleTimelineStartHour + index} />
            ))}
          </div>
        {sortedBookings.length === 0 ? (
          <div className="empty-schedule-slot">
            <span>✂</span>
            <strong>{chair.isWorkingToday ? 'ว่าง' : 'ไม่อยู่ร้าน'}</strong>
            <small>{chair.isWorkingToday ? 'พร้อมรับลูกค้าคิวถัดไป' : 'ไม่มีรอบรับคิววันนี้'}</small>
          </div>
        ) : (
          <>
            {sortedBookings.map((booking) => {
              const placement = getBookingTimelinePlacement(booking)

              return (
                <button
                  className={selectedBookingId === booking.id ? 'schedule-card selected' : `schedule-card status-border-${booking.bookingStatus}`}
                  key={booking.id}
                  onClick={() => onSelectBooking(booking)}
                  style={placement}
                  type="button"
                >
                  <span className="schedule-time">{formatTime(booking.startAt)} - {formatTime(booking.endAt)}</span>
                  <strong>{booking.customerName ?? 'Walk-in customer'}</strong>
                  {(chair.isShared || chair.hasSubstitute) && <em>{booking.barberName}</em>}
                  <small>{booking.services.map((service) => service.serviceName).join(' + ')}</small>
                  <span className={`schedule-card-status status-${booking.bookingStatus}`}>{statusLabels[booking.bookingStatus]}</span>
                </button>
              )
            })}
          </>
        )}
        </div>
      </div>
    </article>
  )
}

function getBookingTimelinePlacement(booking: Booking): CSSProperties {
  const start = new Date(booking.startAt)
  const end = new Date(booking.endAt)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const offsetMinutes = Math.max(0, startMinutes - scheduleTimelineStartHour * 60)
  const durationMinutes = Math.max(30, Math.min(scheduleTimelineMinutes - offsetMinutes, endMinutes - startMinutes))
  const top = (offsetMinutes / 60) * scheduleHourHeightPx
  const height = Math.max(88, (durationMinutes / 60) * scheduleHourHeightPx - 8)

  return {
    top: `${top}px`,
    height: `${height}px`,
  }
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

function formatToolbarDate(value: Date) {
  const weekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  const months = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ]

  return `${weekdays[value.getDay()]} ${value.getDate()} ${months[value.getMonth()]} ${value.getFullYear() + 543}`
}

function getWorkingHourForDate(schedule: BarberSchedule | undefined, dateValue: string) {
  const dayOfWeek = parseLocalDate(dateValue).getDay()

  return schedule?.workingHours.find((workingHour) => workingHour.dayOfWeek === dayOfWeek)
}

function getScheduleChairsForDate(
  barbers: Barber[],
  schedules: Record<string, BarberSchedule>,
  dateValue: string,
) {
  const scheduleBarbers: ScheduleBarber[] = barbers
    .map((barber) => {
      const workingHour = getWorkingHourForDate(schedules[barber.id], dateValue)

      return {
        barber,
        isWorkingToday: Boolean(workingHour?.isWorkingDay && barber.isAvailable),
        workingHour,
      }
    })
  const scheduleBarberByName = new Map(scheduleBarbers.map((item) => [item.barber.fullName, item]))
  const substituteBarber = scheduleBarberByName.get('ช่างเหน่ง')
  let isSubstituteAssigned = false

  const activeChairs = chairConfigs.flatMap((chair) => {
    const regularBarbers = chair.barberNames
      .map((barberName) => scheduleBarberByName.get(barberName))
      .filter((barber): barber is ScheduleBarber => Boolean(barber))
    const workingRegularBarbers = regularBarbers.filter((item) => item.isWorkingToday)
    const canUseSubstitute = workingRegularBarbers.length === 0
      && Boolean(substituteBarber?.isWorkingToday)
      && !isSubstituteAssigned
    const assignedBarbers: ScheduleBarber[] = canUseSubstitute && substituteBarber ? [substituteBarber] : workingRegularBarbers
    const visibleWorkingHours = assignedBarbers
      .map((item) => item.workingHour)
      .filter((workingHour): workingHour is BarberWorkingHour => Boolean(workingHour))

    if (assignedBarbers.length === 0) {
      return []
    }

    if (canUseSubstitute) {
      isSubstituteAssigned = true
    }

    return {
      id: chair.id,
      title: getChairDisplayTitle(chair, assignedBarbers),
      meta: chair.label,
      subtitle: getChairSubtitle(chair, assignedBarbers),
      order: chair.order,
      isShared: chair.barberNames.length > 1,
      hasSubstitute: canUseSubstitute,
      isWorkingToday: assignedBarbers.length > 0,
      workingHours: visibleWorkingHours,
      barbers: assignedBarbers,
    }
  })

  const offDayBarbers = scheduleBarbers.filter((scheduleBarber) => !scheduleBarber.isWorkingToday)
  const offDayStatusChairs = chairConfigs.flatMap((chair) => {
    const chairOffDayBarbers = chair.barberNames
      .map((barberName) => offDayBarbers.find((scheduleBarber) => scheduleBarber.barber.fullName === barberName))
      .filter((scheduleBarber): scheduleBarber is ScheduleBarber => Boolean(scheduleBarber))

    if (chairOffDayBarbers.length === 0) {
      return []
    }

    return [{
      id: `off-${chair.id}`,
      title: getChairDisplayTitle(chair, chairOffDayBarbers),
      meta: 'หยุด',
      subtitle: 'ไม่อยู่ร้านวันนี้',
      order: 100 + chair.order,
      isShared: chairOffDayBarbers.length > 1,
      hasSubstitute: false,
      isWorkingToday: false,
      workingHours: [],
      barbers: chairOffDayBarbers,
    }]
  })

  const substituteOffDayChair = substituteBarber && !substituteBarber.isWorkingToday
    ? [{
      id: `off-${substituteBarber.barber.id}`,
      title: substituteBarber.barber.fullName,
      meta: 'หยุด',
      subtitle: 'ไม่อยู่ร้านวันนี้',
      order: 199,
      isShared: false,
      hasSubstitute: false,
      isWorkingToday: false,
      workingHours: [],
      barbers: [substituteBarber],
    }]
    : []

  return [...activeChairs, ...offDayStatusChairs, ...substituteOffDayChair]
}

function getScheduleBoardGridStyle(scheduleChairs: ScheduleChair[]): CSSProperties {
  const columns = scheduleChairs.map((chair) => {
    if (chair.isWorkingToday) {
      return 'minmax(150px, 1fr)'
    }

    return chair.isShared ? '104px' : '76px'
  })

  return {
    gridTemplateColumns: ['44px', ...columns].join(' '),
  }
}

function sortBarbersByChair(barbers: Barber[]) {
  return [...barbers].sort((left, right) => {
    const leftOrder = getBarberChairOrder(left.fullName)
    const rightOrder = getBarberChairOrder(right.fullName)

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.fullName.localeCompare(right.fullName, 'th')
  })
}

function getBarberChairOrder(fullName: string) {
  const chairOrder: Record<string, number> = {
    'ช่างเค๊ก': 1,
    'ช่างบั้ม': 2,
    'ช่างนุค': 3,
    'ช่างนุ้ย': 3,
    'ช่างเปิ้ล': 4,
    'ช่างเดียว': 5,
    'ช่างเหน่ง': 99,
  }

  return chairOrder[fullName] ?? 50
}

function getChairSubtitle(chair: ChairConfig, assignedBarbers: ScheduleBarber[]) {
  const assignedBarberNames = assignedBarbers.map((item) => item.barber.fullName)

  if (assignedBarberNames.includes('ช่างเหน่ง')) {
    return `แทน ${chair.barberNames.join(' / ')}`
  }

  if (assignedBarberNames.includes('ช่างบั้ม')) {
    return 'ผมยาว'
  }

  return chair.note
}

function getChairDisplayTitle(chair: ChairConfig, assignedBarbers: ScheduleBarber[]) {
  if (chair.id === 'chair-3') {
    return 'ช่างนุค / นุ้ย'
  }

  return assignedBarbers.length > 0
    ? assignedBarbers.map((item) => item.barber.fullName).join(' / ')
    : chair.barberNames.join(' / ')
}

function getBarberBookingLabel(barber: Barber) {
  if (barber.fullName === 'ช่างนุ้ย') {
    return `${barber.fullName} (เก้าอี้ 3 / จองล่วงหน้า)`
  }

  if (barber.fullName === 'ช่างนุค') {
    return `${barber.fullName} (เก้าอี้ 3 / ใช้ร่วมกับช่างนุ้ย)`
  }

  return barber.fullName
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getTomorrowDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)

  return formatLocalDateInputValue(date)
}

function getTodayDate() {
  return formatLocalDateInputValue(new Date())
}

function addDays(dateValue: string, days: number) {
  const date = parseLocalDate(dateValue)
  date.setDate(date.getDate() + days)

  return formatLocalDateInputValue(date)
}

function clampDateToToday(dateValue: string) {
  const today = getTodayDate()

  return dateValue < today ? today : dateValue
}

function parseLocalDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`)
}

function getDefaultBookingDateTime(dateValue: string) {
  if (dateValue === getTodayDate()) {
    return getMinimumStaffBookingDateTime()
  }

  return `${dateValue}T10:00`
}

function getMinimumStaffBookingDateTime(dateValue = getTodayDate()) {
  const today = getTodayDate()

  return dateValue <= today ? formatLocalDateTimeInputValue(roundUpToNextSlot(new Date(), 30)) : `${dateValue}T10:00`
}

function clampDateTimeToMinimum(dateTimeValue: string) {
  const dateValue = clampDateToToday(dateTimeValue.slice(0, 10))
  const normalizedValue = dateTimeValue.slice(0, 10) < dateValue
    ? getDefaultBookingDateTime(dateValue)
    : dateTimeValue
  const minimumValue = getMinimumStaffBookingDateTime(dateValue)

  return normalizedValue < minimumValue ? minimumValue : normalizedValue
}

function roundUpToNextSlot(value: Date, intervalMinutes: number) {
  const date = new Date(value)
  const remainder = date.getMinutes() % intervalMinutes

  if (remainder > 0) {
    date.setMinutes(date.getMinutes() + intervalMinutes - remainder)
  }

  date.setSeconds(0, 0)

  return date
}

function formatLocalDateInputValue(value: Date) {
  const date = new Date()
  date.setTime(value.getTime())
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())

  return date.toISOString().slice(0, 10)
}

function formatLocalDateTimeInputValue(value: Date) {
  const date = new Date()
  date.setTime(value.getTime())
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())

  return date.toISOString().slice(0, 16)
}

export default App
