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

type ServiceGroup = {
  title: string
  description: string
  services: Service[]
}

type Barber = {
  id: string
  userId: string
  fullName: string
  nickname: string | null
  email: string
  phoneNumber: string
  specialty: string | null
  experienceYears: number | null
  bio: string | null
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

type ChairScheduleBarber = {
  assignmentId: string
  barberId: string
  fullName: string
  nickname: string | null
  email: string
  isPrimary: boolean
  assignmentNote: string | null
  startDate: string
  endDate: string | null
}

type ChairScheduleConfig = {
  id: string
  name: string
  note: string | null
  sortOrder: number
  isActive: boolean
  barbers: ChairScheduleBarber[]
}

type Chair = {
  id: string
  name: string
  note: string | null
  sortOrder: number
  isActive: boolean
}

type ChairAssignment = {
  id: string
  chairId: string
  chairName: string
  barberId: string
  barberName: string
  startDate: string
  endDate: string | null
  isPrimary: boolean
  note: string | null
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
  barberIds: string[]
  barberNames: string[]
  barberEmails: string[]
  standbyBarberIds: string[]
  standbyBarberNames: string[]
  standbyBarberEmails: string[]
}

const defaultChairConfigs: ChairConfig[] = [
  { id: 'chair-1', label: 'เก้าอี้ 1', note: 'ติดกระจก', order: 1, barberIds: [], barberNames: ['ช่างเค้ก'], barberEmails: ['cake.barber@rodeobarber.local'], standbyBarberIds: [], standbyBarberNames: ['ช่างเหน่ง'], standbyBarberEmails: ['neng.barber@rodeobarber.local'] },
  { id: 'chair-2', label: 'เก้าอี้ 2', note: 'เก้าอี้ประจำ', order: 2, barberIds: [], barberNames: ['ช่างบั้ม'], barberEmails: ['bum.barber@rodeobarber.local'], standbyBarberIds: [], standbyBarberNames: ['ช่างเหน่ง'], standbyBarberEmails: ['neng.barber@rodeobarber.local'] },
  { id: 'chair-3', label: 'เก้าอี้ 3', note: 'ช่างนุ้ยจองล่วงหน้า 1 วัน', order: 3, barberIds: [], barberNames: ['ช่างนุค', 'ช่างนุ้ย'], barberEmails: ['nook.barber@rodeobarber.local', 'nui.barber@rodeobarber.local'], standbyBarberIds: [], standbyBarberNames: ['ช่างเหน่ง'], standbyBarberEmails: ['neng.barber@rodeobarber.local'] },
  { id: 'chair-4', label: 'เก้าอี้ 4', note: 'เก้าอี้ประจำ', order: 4, barberIds: [], barberNames: ['ช่างเปิ้ล'], barberEmails: ['ple.barber@rodeobarber.local'], standbyBarberIds: [], standbyBarberNames: ['ช่างเหน่ง'], standbyBarberEmails: ['neng.barber@rodeobarber.local'] },
  { id: 'chair-5', label: 'เก้าอี้ 5', note: 'หน้าทีวี', order: 5, barberIds: [], barberNames: ['ช่างเดียว'], barberEmails: ['deaw.barber@rodeobarber.local'], standbyBarberIds: [], standbyBarberNames: ['ช่างเหน่ง'], standbyBarberEmails: ['neng.barber@rodeobarber.local'] },
]

const scheduleTimelineStartHour = 10
const scheduleTimelineEndHour = 21
const scheduleTimelineMinutes = (scheduleTimelineEndHour - scheduleTimelineStartHour) * 60
const scheduleHourHeightPx = 96
const rosterAssignmentStartDate = '2026-01-01'
const bookingStartHours = Array.from(
  { length: scheduleTimelineEndHour - scheduleTimelineStartHour },
  (_, index) => scheduleTimelineStartHour + index,
)

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
  cancelReason: string | null
  cancelledAt: string | null
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

type CustomerLookup = {
  id: string
  fullName: string
  phoneNumber: string
  email: string
}

const nextStatus: Record<string, string> = {
  PendingConfirmation: 'Confirmed',
  Confirmed: 'InService',
  WaitingService: 'InService',
  InService: 'WaitingPayment',
}

const previousStatus: Record<string, string> = {
  Confirmed: 'PendingConfirmation',
  WaitingService: 'Confirmed',
  InService: 'Confirmed',
  WaitingPayment: 'InService',
}

const cancellableStatuses = ['PendingConfirmation']

const statusLabels: Record<string, string> = {
  PendingConfirmation: 'รอยืนยัน',
  Confirmed: 'มาถึงร้าน',
  WaitingService: 'มาถึงร้าน',
  InService: 'กำลังให้บริการ',
  WaitingPayment: 'รอชำระเงิน',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิก',
  NoShow: 'ไม่มาตามนัด',
}

const cancelReasonOptions = [
  'ลูกค้าไม่มาตามนัด',
  'ลูกค้ามาไม่ทัน',
  'จองผิดเวลา',
  'ลูกค้าขอเลื่อนเวลา',
  'ลูกค้าขอยกเลิก',
]

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
  const [barberQueue, setBarberQueue] = useState<Booking[]>([])
  const [barberProfile, setBarberProfile] = useState<Barber | null>(null)
  const [isBarberProfileEditing, setIsBarberProfileEditing] = useState(false)
  const [barberProfileForm, setBarberProfileForm] = useState({
    fullName: '',
    nickname: '',
    phoneNumber: '',
    specialty: '',
    experienceYears: '',
    bio: '',
    isAvailable: true,
    acceptsBooking: true,
  })
  const [barberScheduleDate, setBarberScheduleDate] = useState(getTodayDate())
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedBookingHistory, setSelectedBookingHistory] = useState<Booking[]>([])
  const [isCancelBookingOpen, setIsCancelBookingOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
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
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const staffBookingServiceGroups = useMemo(() => groupServicesForBooking(services), [services])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [barberSchedules, setBarberSchedules] = useState<Record<string, BarberSchedule>>({})
  const [scheduleChairConfigs, setScheduleChairConfigs] = useState<ChairConfig[]>(defaultChairConfigs)
  const [chairs, setChairs] = useState<Chair[]>([])
  const [chairAssignments, setChairAssignments] = useState<ChairAssignment[]>([])
  const [sharedChairIds, setSharedChairIds] = useState<string[]>([])
  const [standbyModalBarberId, setStandbyModalBarberId] = useState<string | null>(null)
  const [standbyModalChairIds, setStandbyModalChairIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [bookingDate, setBookingDate] = useState(getTomorrowDate())
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [customerReceipt, setCustomerReceipt] = useState<Receipt | null>(null)
  const [isStaffBookingFormOpen, setIsStaffBookingFormOpen] = useState(false)
  const staffBookingFormRef = useRef<HTMLFormElement | null>(null)
  const scheduleDatePickerRef = useRef<HTMLDivElement | null>(null)
  const [scheduleDate, setScheduleDate] = useState(getTodayDate())
  const [isScheduleDatePickerOpen, setIsScheduleDatePickerOpen] = useState(false)
  const [scheduleCalendarMonth, setScheduleCalendarMonth] = useState(getMonthKey(getTodayDate()))
  const [staffBookingContext, setStaffBookingContext] = useState('')
  const [staffBookingBarberOptions, setStaffBookingBarberOptions] = useState<string[]>([])
  const [staffBookingCustomerSuggestions, setStaffBookingCustomerSuggestions] = useState<CustomerLookup[]>([])
  const [isStaffBookingCustomerLookupOpen, setIsStaffBookingCustomerLookupOpen] = useState(false)
  const [staffBookingForm, setStaffBookingForm] = useState({
    ...createEmptyStaffBookingForm('', getDefaultBookingDateTime(getTodayDate())),
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
    () => getScheduleChairsForDate(barbers, barberSchedules, scheduleChairConfigs, scheduleDate),
    [barberSchedules, barbers, scheduleChairConfigs, scheduleDate],
  )
  const currentRosterChairAssignments = useMemo(
    () => chairAssignments.filter((assignment) => !assignment.endDate || assignment.endDate >= rosterAssignmentStartDate),
    [chairAssignments],
  )
  const activePrimaryAssignmentsByChair = useMemo(() => {
    const assignmentMap = new Map<string, ChairAssignment[]>()
    currentRosterChairAssignments
      .filter((assignment) => assignment.isPrimary)
      .forEach((assignment) => {
        const current = assignmentMap.get(assignment.chairId) ?? []
        assignmentMap.set(assignment.chairId, [...current, assignment])
      })

    chairs.forEach((chair) => {
      const assignments = assignmentMap.get(chair.id)
      if (assignments) {
        assignmentMap.set(chair.id, sortChairAssignmentsForDisplay(assignments, chair))
      }
    })

    return assignmentMap
  }, [currentRosterChairAssignments, chairs])
  const activeStandbyAssignments = useMemo(
    () => currentRosterChairAssignments.filter((assignment) => !assignment.isPrimary),
    [currentRosterChairAssignments],
  )
  const standbyBarberIds = useMemo(
    () => [...new Set(activeStandbyAssignments.map((assignment) => assignment.barberId))],
    [activeStandbyAssignments],
  )
  const standbyBarbers = useMemo(
    () => standbyBarberIds
      .map((barberId) => barbers.find((barber) => barber.id === barberId))
      .filter((barber): barber is Barber => Boolean(barber)),
    [barbers, standbyBarberIds],
  )
  const staffPanelTitle =
    activeStaffPanel === 'queue' ? 'จัดการคิววันนี้' : activeStaffPanel === 'accounts' ? 'บัญชีรับเงินร้าน' : 'จัดการพนักงาน'
  const queueSummary = {
    total: queue.length,
    confirmed: queue.filter((booking) => booking.bookingStatus === 'Confirmed' || booking.bookingStatus === 'WaitingService').length,
    inProgress: queue.filter((booking) => booking.bookingStatus === 'InService' || booking.bookingStatus === 'WaitingPayment').length,
    completed: queue.filter((booking) => booking.bookingStatus === 'Completed').length,
    pending: queue.filter((booking) => booking.bookingStatus === 'PendingConfirmation').length,
    cancelled: queue.filter((booking) => booking.bookingStatus === 'Cancelled').length,
    revenue: queue
      .filter((booking) => booking.paymentStatus === 'Paid' || booking.bookingStatus === 'Completed')
      .reduce((total, booking) => total + booking.totalAmount, 0),
  }
  const barberQueueSummary = {
    total: barberQueue.length,
    pending: barberQueue.filter((booking) => booking.bookingStatus === 'PendingConfirmation').length,
    ready: barberQueue.filter((booking) => booking.bookingStatus === 'Confirmed' || booking.bookingStatus === 'WaitingService').length,
    inProgress: barberQueue.filter((booking) => booking.bookingStatus === 'InService' || booking.bookingStatus === 'WaitingPayment').length,
    completed: barberQueue.filter((booking) => booking.bookingStatus === 'Completed').length,
    cancelled: barberQueue.filter((booking) => booking.bookingStatus === 'Cancelled' || booking.bookingStatus === 'NoShow').length,
  }
  const scheduleCalendarDays = useMemo(() => getCalendarDays(scheduleCalendarMonth), [scheduleCalendarMonth])

  function openScheduleDatePicker() {
    setScheduleCalendarMonth(getMonthKey(scheduleDate))
    setIsScheduleDatePickerOpen((current) => !current)
  }

function selectScheduleDate(dateValue: string) {
    setScheduleDate(dateValue)
    setScheduleCalendarMonth(getMonthKey(dateValue))
    setIsScheduleDatePickerOpen(false)
  }

  useEffect(() => {
    if (!auth) return

    if (auth.role === 'Customer') {
      void refreshCustomerData()
    } else if (auth.role === 'Barber') {
      void refreshBarberQueue(barberScheduleDate)
      void refreshBarberProfile()
    } else {
      void refreshQueue(scheduleDate)
      void refreshBarbers()
      void refreshServices()
      void refreshPaymentAccounts()
      if (auth.role === 'Owner' || auth.role === 'Admin') {
        void refreshStaffAccounts()
        void refreshChairManagement()
      }
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  useEffect(() => {
    if (!auth || auth.role === 'Customer' || auth.role === 'Barber') return

    void refreshQueue(scheduleDate)
    void refreshScheduleChairConfigs(scheduleDate)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleDate])

  useEffect(() => {
    if (!auth || auth.role !== 'Barber') return

    void refreshBarberQueue(barberScheduleDate)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [barberScheduleDate])

  useEffect(() => {
    if (!isScheduleDatePickerOpen) return undefined

    function closeDatePickerOnOutsideClick(event: globalThis.MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (scheduleDatePickerRef.current?.contains(target)) return

      setIsScheduleDatePickerOpen(false)
    }

    document.addEventListener('mousedown', closeDatePickerOnOutsideClick)

    return () => document.removeEventListener('mousedown', closeDatePickerOnOutsideClick)
  }, [isScheduleDatePickerOpen])

  useEffect(() => {
    if (!isStaffBookingFormOpen || staffBookingForm.customerId) {
      setStaffBookingCustomerSuggestions([])
      setIsStaffBookingCustomerLookupOpen(false)
      return undefined
    }

    const query = staffBookingForm.guestPhoneNumber.trim()
      || staffBookingForm.guestName.trim()
      || staffBookingForm.guestEmail.trim()
    if (query.length < 2) {
      setStaffBookingCustomerSuggestions([])
      setIsStaffBookingCustomerLookupOpen(false)
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      api<CustomerLookup[]>(`/api/customers/lookup?query=${encodeURIComponent(query)}`)
        .then((result) => {
          setStaffBookingCustomerSuggestions(result)
          setIsStaffBookingCustomerLookupOpen(result.length > 0)
        })
        .catch(() => {
          setStaffBookingCustomerSuggestions([])
          setIsStaffBookingCustomerLookupOpen(false)
        })
    }, 250)

    return () => window.clearTimeout(timeoutId)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isStaffBookingFormOpen,
    staffBookingForm.customerId,
    staffBookingForm.guestEmail,
    staffBookingForm.guestName,
    staffBookingForm.guestPhoneNumber,
  ])

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
      await refreshScheduleChairConfigs(bookingDate)
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
      await refreshScheduleChairConfigs(scheduleDate)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดรายชื่อช่างไม่สำเร็จ')
    }
  }

  async function refreshScheduleChairConfigs(targetDate = scheduleDate) {
    const result = await api<ChairScheduleConfig[]>(`/api/chairs/schedule?date=${targetDate}`)
    const mappedChairs = result
      .filter((chair) => chair.isActive)
      .map((chair) => {
        const primaryBarbers = sortChairScheduleBarbers(
          chair.barbers.filter((barber) => barber.isPrimary),
          chair,
        )
        const standbyBarbers = sortChairScheduleBarbers(
          chair.barbers.filter((barber) => !barber.isPrimary),
          chair,
        )

        return {
          id: chair.id,
          label: chair.name,
          note: chair.note ?? '',
          order: chair.sortOrder,
          barberIds: primaryBarbers.map((barber) => barber.barberId),
          barberNames: primaryBarbers.map((barber) => barber.fullName),
          barberEmails: primaryBarbers.map((barber) => barber.email),
          standbyBarberIds: standbyBarbers.map((barber) => barber.barberId),
          standbyBarberNames: standbyBarbers.map((barber) => barber.fullName),
          standbyBarberEmails: standbyBarbers.map((barber) => barber.email),
        }
      })

    setScheduleChairConfigs(mappedChairs.length > 0 ? mappedChairs : defaultChairConfigs)
  }

  async function refreshChairManagement() {
    try {
      const [chairResult, assignmentResult] = await Promise.all([
        api<Chair[]>('/api/chairs'),
        api<ChairAssignment[]>('/api/chairs/assignments'),
      ])

      setChairs(chairResult)
      setChairAssignments(assignmentResult)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดข้อมูลเก้าอี้ไม่สำเร็จ')
    }
  }

  async function savePrimaryChairAssignment(chair: Chair, barberId: string) {
    if (!barberId) return

    const currentAssignments = activePrimaryAssignmentsByChair.get(chair.id) ?? []
    const currentAssignment = currentAssignments[0]
    if (currentAssignments.length === 1 && currentAssignment?.barberId === barberId) return

    setIsBusy(true)
    setMessage('')

    try {
      if (currentAssignment) {
        await api(`/api/chairs/assignments/${currentAssignment.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            chairId: chair.id,
            barberId,
            startDate: rosterAssignmentStartDate,
            endDate: currentAssignment.endDate,
            isPrimary: true,
            note: chair.note || null,
          }),
        })
      } else {
        await api(`/api/chairs/${chair.id}/assignments`, {
          method: 'POST',
          body: JSON.stringify({
            barberId,
            startDate: rosterAssignmentStartDate,
            endDate: null,
            isPrimary: true,
            note: chair.note || null,
          }),
        })
      }

      await Promise.all(
        currentAssignments
          .slice(1)
          .map((assignment) => api(`/api/chairs/assignments/${assignment.id}`, { method: 'DELETE' })),
      )

      await refreshChairManagement()
      await refreshScheduleChairConfigs(scheduleDate)
      setMessage(`บันทึกช่างประจำ ${chair.name} แล้ว`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกช่างประจำไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function saveSharedChairAssignments(chair: Chair, primaryBarberId: string, secondaryBarberId: string) {
    const currentAssignments = activePrimaryAssignmentsByChair.get(chair.id) ?? []
    const nextBarberIds = [primaryBarberId, secondaryBarberId].filter((barberId, index, barberIds) => (
      barberId && barberIds.indexOf(barberId) === index
    ))

    if (nextBarberIds.length === 0) return

    setIsBusy(true)
    setMessage('')

    try {
      await Promise.all(nextBarberIds.map((barberId, index) => {
        const existingAssignment = currentAssignments[index]
        const payload = {
          chairId: chair.id,
          barberId,
          startDate: rosterAssignmentStartDate,
          endDate: existingAssignment?.endDate ?? null,
          isPrimary: true,
          note: index === 0 ? 'ช่างหลัก' : 'ช่างรอง',
        }

        return existingAssignment
          ? api(`/api/chairs/assignments/${existingAssignment.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
          : api(`/api/chairs/${chair.id}/assignments`, {
            method: 'POST',
            body: JSON.stringify({
              barberId,
              startDate: rosterAssignmentStartDate,
              endDate: null,
              isPrimary: true,
              note: payload.note,
            }),
          })
      }))

      await Promise.all(
        currentAssignments
          .slice(nextBarberIds.length)
          .map((assignment) => api(`/api/chairs/assignments/${assignment.id}`, { method: 'DELETE' })),
      )

      await refreshChairManagement()
      await refreshScheduleChairConfigs(scheduleDate)
      setMessage(`บันทึกช่างหลัก/รอง ${chair.name} แล้ว`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกช่างหลัก/รองไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  function changeSharedPrimaryChairAssignment(chair: Chair, nextPrimaryBarberId: string) {
    const currentAssignments = activePrimaryAssignmentsByChair.get(chair.id) ?? []
    const currentPrimaryBarberId = currentAssignments[0]?.barberId ?? ''
    const currentSecondaryBarberId = currentAssignments[1]?.barberId ?? ''
    const nextSecondaryBarberId = nextPrimaryBarberId === currentSecondaryBarberId
      ? currentPrimaryBarberId
      : currentSecondaryBarberId

    void saveSharedChairAssignments(chair, nextPrimaryBarberId, nextSecondaryBarberId)
  }

  function changeSharedSecondaryChairAssignment(chair: Chair, nextSecondaryBarberId: string) {
    const currentAssignments = activePrimaryAssignmentsByChair.get(chair.id) ?? []
    const currentPrimaryBarberId = currentAssignments[0]?.barberId ?? ''
    const currentSecondaryBarberId = currentAssignments[1]?.barberId ?? ''
    const nextPrimaryBarberId = nextSecondaryBarberId === currentPrimaryBarberId
      ? currentSecondaryBarberId
      : currentPrimaryBarberId

    void saveSharedChairAssignments(chair, nextPrimaryBarberId, nextSecondaryBarberId)
  }

  async function toggleChairSharing(chair: Chair, isCurrentlyShared: boolean) {
    const currentAssignments = activePrimaryAssignmentsByChair.get(chair.id) ?? []

    if (!isCurrentlyShared) {
      setSharedChairIds((current) => current.includes(chair.id) ? current : [...current, chair.id])
      return
    }

    setIsBusy(true)
    setMessage('')

    try {
      await Promise.all(
        currentAssignments
          .slice(1)
          .map((assignment) => api(`/api/chairs/assignments/${assignment.id}`, { method: 'DELETE' })),
      )

      setSharedChairIds((current) => current.filter((chairId) => chairId !== chair.id))
      await refreshChairManagement()
      await refreshScheduleChairConfigs(scheduleDate)
      setMessage(`ปิดแชร์ ${chair.name} แล้ว`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ปิดแชร์เก้าอี้ไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  function openStandbyModal(barberId: string) {
    const assignedChairIds = activeStandbyAssignments
      .filter((assignment) => assignment.barberId === barberId)
      .map((assignment) => assignment.chairId)

    setStandbyModalBarberId(barberId)
    setStandbyModalChairIds(assignedChairIds)
  }

  function toggleStandbyChair(chairId: string) {
    setStandbyModalChairIds((current) => (
      current.includes(chairId)
        ? current.filter((selectedChairId) => selectedChairId !== chairId)
        : [...current, chairId]
    ))
  }

  async function saveStandbyAssignments() {
    if (!standbyModalBarberId) return

    setIsBusy(true)
    setMessage('')

    try {
      const currentAssignments = activeStandbyAssignments.filter((assignment) => assignment.barberId === standbyModalBarberId)
      const currentChairIds = new Set(currentAssignments.map((assignment) => assignment.chairId))
      const desiredChairIds = new Set(standbyModalChairIds)
      const assignmentsToDelete = currentAssignments.filter((assignment) => !desiredChairIds.has(assignment.chairId))
      const chairIdsToCreate = standbyModalChairIds.filter((chairId) => !currentChairIds.has(chairId))

      await Promise.all([
        ...assignmentsToDelete.map((assignment) => api(`/api/chairs/assignments/${assignment.id}`, { method: 'DELETE' })),
        ...chairIdsToCreate.map((chairId) => api(`/api/chairs/${chairId}/assignments`, {
          method: 'POST',
          body: JSON.stringify({
            barberId: standbyModalBarberId,
            startDate: rosterAssignmentStartDate,
            endDate: null,
            isPrimary: false,
            note: 'ช่างสำรองรอแทนเก้าอี้ว่าง',
          }),
        })),
      ])

      setStandbyModalBarberId(null)
      setStandbyModalChairIds([])
      await refreshChairManagement()
      await refreshScheduleChairConfigs(scheduleDate)
      setMessage('บันทึกช่างสำรองแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกช่างสำรองไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function refreshBarberSchedules(targetBarbers: Barber[]) {
    const schedules = await Promise.all(
      targetBarbers.map((barber) => api<BarberSchedule>(`/api/barbers/${barber.id}/schedule`)),
    )

    setBarberSchedules(Object.fromEntries(schedules.map((schedule) => [schedule.barberId, schedule])))
  }

  async function toggleBarberWorkingDay(barber: Barber, dayOfWeek: number) {
    const currentSchedule = barberSchedules[barber.id]
    const existingWorkingHours = currentSchedule?.workingHours ?? []
    const existingWorkingHour = existingWorkingHours.find((workingHour) => workingHour.dayOfWeek === dayOfWeek)
    const nextIsWorkingDay = !(existingWorkingHour?.isWorkingDay ?? false)
    const nextWorkingHours = [0, 1, 2, 3, 4, 5, 6].map((day) => {
      const workingHour = existingWorkingHours.find((item) => item.dayOfWeek === day)

      return {
        dayOfWeek: day,
        startTime: workingHour?.startTime ?? '10:00:00',
        endTime: workingHour?.endTime ?? '21:00:00',
        isWorkingDay: day === dayOfWeek ? nextIsWorkingDay : (workingHour?.isWorkingDay ?? false),
      }
    })

    setIsBusy(true)
    setMessage('')

    try {
      const updatedSchedule = await api<BarberSchedule>(`/api/barbers/${barber.id}/working-hours`, {
        method: 'PUT',
        body: JSON.stringify({ workingHours: nextWorkingHours }),
      })

      setBarberSchedules((current) => ({
        ...current,
        [barber.id]: updatedSchedule,
      }))
      await refreshScheduleChairConfigs(scheduleDate)
      setMessage(nextIsWorkingDay ? `เปิดวันทำงานของ ${barber.fullName} แล้ว` : `ปิดวันทำงานของ ${barber.fullName} แล้ว`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกวันทำงานไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
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

  async function refreshBarberQueue(targetDate = barberScheduleDate) {
    try {
      const result = await api<Booking[]>(`/api/queue/me?date=${targetDate}`)
      setBarberQueue(result)
      setSelectedBooking((current) => current && result.some((booking) => booking.id === current.id) ? current : null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดคิวของช่างไม่สำเร็จ')
    }
  }

  async function refreshBarberProfile() {
    try {
      const result = await api<Barber>('/api/barbers/me')
      setBarberProfile(result)
      setBarberProfileForm({
        fullName: result.fullName,
        nickname: result.nickname ?? '',
        phoneNumber: result.phoneNumber,
        specialty: result.specialty ?? '',
        experienceYears: result.experienceYears?.toString() ?? '',
        bio: result.bio ?? '',
        isAvailable: result.isAvailable,
        acceptsBooking: result.acceptsBooking,
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'โหลดข้อมูลช่างไม่สำเร็จ')
    }
  }

  async function saveBarberProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')

    try {
      const result = await api<Barber>('/api/barbers/me', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: barberProfileForm.fullName,
          nickname: barberProfileForm.nickname || null,
          phoneNumber: barberProfileForm.phoneNumber,
          specialty: barberProfileForm.specialty || null,
          experienceYears: barberProfileForm.experienceYears ? Number(barberProfileForm.experienceYears) : null,
          bio: barberProfileForm.bio || null,
          isAvailable: barberProfileForm.isAvailable,
          acceptsBooking: barberProfileForm.acceptsBooking,
        }),
      })

      setBarberProfile(result)
      setBarberProfileForm({
        fullName: result.fullName,
        nickname: result.nickname ?? '',
        phoneNumber: result.phoneNumber,
        specialty: result.specialty ?? '',
        experienceYears: result.experienceYears?.toString() ?? '',
        bio: result.bio ?? '',
        isAvailable: result.isAvailable,
        acceptsBooking: result.acceptsBooking,
      })
      setAuth((current) => current ? { ...current, fullName: result.fullName } : current)
      setIsBarberProfileEditing(false)
      setMessage('บันทึกข้อมูลส่วนตัวแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกข้อมูลส่วนตัวไม่สำเร็จ')
    } finally {
      setIsBusy(false)
    }
  }

  async function cancelBooking() {
    if (!selectedBooking) return

    setIsBusy(true)
    setMessage('')

    try {
      await api(`/api/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: cancelReason.trim() || null,
        }),
      })
      await refreshQueue()
      setSelectedBooking(null)
      setSelectedBookingHistory([])
      setPaymentSummary(null)
      setStaffReceipt(null)
      setIsCancelBookingOpen(false)
      setCancelReason('')
      setMessage('ยกเลิกคิวแล้ว')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ยกเลิกคิวไม่สำเร็จ')
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
          experienceYears: getExperienceYearsFromStartDate(staffForm.startDate),
          bio: staffForm.bio || null,
          isAvailable: staffForm.role === 'Barber',
          acceptsBooking: staffForm.role === 'Barber',
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
      if (staffForm.role === 'Barber') {
        await refreshBarbers()
      }
      setIsStaffModalOpen(false)
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
      const shouldActivateBarber = accountStatus === 'Active' && staff.role === 'Barber'
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
          isAvailable: shouldActivateBarber,
          acceptsBooking: shouldActivateBarber,
        }),
      })
      await refreshStaffAccounts()
      if (staff.role === 'Barber') {
        await refreshBarbers()
        await refreshChairManagement()
      }
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
          experienceYears: getExperienceYearsFromStartDate(editStaffForm.startDate),
          bio: editStaffForm.bio || null,
          isAvailable: editStaffForm.role === 'Barber' && editStaffForm.accountStatus === 'Active',
          acceptsBooking: editStaffForm.role === 'Barber' && editStaffForm.accountStatus === 'Active',
        }),
      })

      setEditingStaffId(null)
      await refreshStaffAccounts()
      if (staff.role === 'Barber' || editStaffForm.role === 'Barber') {
        await refreshBarbers()
      }
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
          customerId: staffBookingForm.customerId || null,
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
      setStaffBookingForm(createEmptyStaffBookingForm(staffBookingForm.barberId, getDefaultBookingDateTime(createdBookingDate)))
      setStaffBookingCustomerSuggestions([])
      setIsStaffBookingCustomerLookupOpen(false)
      setScheduleDate(createdBookingDate)
      await refreshQueue(createdBookingDate)
      setSelectedBooking(null)
      setSelectedBookingHistory([])
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

    setStaffBookingForm(createEmptyStaffBookingForm(defaultBarberId, getDefaultBookingDateTime(defaultBookingDate)))
    setStaffBookingContext(`${chair.title} / ${chair.meta}`)
    setStaffBookingBarberOptions(optionIds)
    setIsStaffBookingFormOpen(true)
  }

  function closeStaffBookingForm() {
    const defaultBookingDate = clampDateToToday(scheduleDate)
    setIsStaffBookingFormOpen(false)
    setStaffBookingContext('')
    setStaffBookingBarberOptions([])
    setStaffBookingForm(createEmptyStaffBookingForm('', getDefaultBookingDateTime(defaultBookingDate)))
    setStaffBookingCustomerSuggestions([])
    setIsStaffBookingCustomerLookupOpen(false)
  }

  function selectStaffBookingCustomer(customer: CustomerLookup) {
    setStaffBookingForm((current) => ({
      ...current,
      customerId: customer.id,
      guestName: customer.fullName,
      guestPhoneNumber: customer.phoneNumber,
      guestEmail: customer.email,
    }))
    setStaffBookingCustomerSuggestions([])
    setIsStaffBookingCustomerLookupOpen(false)
  }

  function openBookingDetail(booking: Booking, history: Booking[] = [booking]) {
    setSelectedBooking(booking)
    setSelectedBookingHistory(history)
    setPaymentSummary(null)
    setStaffReceipt(null)
    setIsCancelBookingOpen(false)
    setCancelReason('')
  }

  function closeBookingDetail() {
    setSelectedBooking(null)
    setSelectedBookingHistory([])
    setPaymentSummary(null)
    setStaffReceipt(null)
    setIsCancelBookingOpen(false)
    setCancelReason('')
  }

  function closeBarberProfileEditor() {
    if (barberProfile) {
      setBarberProfileForm({
        fullName: barberProfile.fullName,
        nickname: barberProfile.nickname ?? '',
        phoneNumber: barberProfile.phoneNumber,
        specialty: barberProfile.specialty ?? '',
        experienceYears: barberProfile.experienceYears?.toString() ?? '',
        bio: barberProfile.bio ?? '',
        isAvailable: barberProfile.isAvailable,
        acceptsBooking: barberProfile.acceptsBooking,
      })
    }

    setIsBarberProfileEditing(false)
  }

  function logout() {
    setAuth(null)
    setQueue([])
    setBarberQueue([])
    setBarberProfile(null)
    setIsBarberProfileEditing(false)
    setMyBookings([])
    setAvailability([])
    setSelectedBooking(null)
    setSelectedBookingHistory([])
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

  if (auth.role === 'Barber') {
    const sortedBarberQueue = [...barberQueue].sort((first, second) => new Date(first.startAt).getTime() - new Date(second.startAt).getTime())
    const activeBarberQueue = sortedBarberQueue.filter((booking) => booking.bookingStatus !== 'Cancelled' && booking.bookingStatus !== 'NoShow')
    const inactiveBarberQueue = sortedBarberQueue.filter((booking) => booking.bookingStatus === 'Cancelled' || booking.bookingStatus === 'NoShow')

    return (
      <main className="barber-workspace">
        <header className="barber-workspace-header">
          <div>
            <p className="eyebrow">Barber Workspace</p>
            <h1>คิวของฉัน</h1>
            <small>ดูตารางงานรายวันและรายละเอียดบริการของลูกค้าที่รับผิดชอบ</small>
          </div>
          <div className="backoffice-user">
            <span className="backoffice-user-avatar">{getInitials(auth.fullName)}</span>
            <div>
              <strong>{auth.fullName}</strong>
              <small>ช่างประจำร้าน</small>
            </div>
            <button className="secondary barber-profile-trigger" onClick={() => setIsBarberProfileEditing(true)} type="button">
              โปรไฟล์
            </button>
            <button className="secondary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </header>

        {message && <p className="notice">{message}</p>}

        <section className="barber-day-card">
          <div className="barber-day-toolbar">
            <div className="schedule-date-controls">
              <button className="secondary schedule-nav-button" aria-label="ก่อนหน้า" onClick={() => setBarberScheduleDate(addDays(barberScheduleDate, -1))} type="button">
                ←
              </button>
              <div className="barber-date-display">{formatToolbarDate(parseLocalDate(barberScheduleDate))}</div>
              <button className="secondary schedule-nav-button" aria-label="ถัดไป" onClick={() => setBarberScheduleDate(addDays(barberScheduleDate, 1))} type="button">
                →
              </button>
              <button className="secondary" onClick={() => setBarberScheduleDate(getTodayDate())} type="button">
                วันนี้
              </button>
            </div>
            <button className="secondary" disabled={isBusy} onClick={() => refreshBarberQueue(barberScheduleDate)} type="button">
              Refresh
            </button>
          </div>

          <div className="barber-summary-grid">
            <section>
              <span>คิวทั้งหมด</span>
              <strong>{barberQueueSummary.total}</strong>
            </section>
            <section>
              <span>รอยืนยัน</span>
              <strong>{barberQueueSummary.pending}</strong>
            </section>
            <section>
              <span>มาถึงร้าน</span>
              <strong>{barberQueueSummary.ready}</strong>
            </section>
            <section>
              <span>กำลังทำ/รอจ่าย</span>
              <strong>{barberQueueSummary.inProgress}</strong>
            </section>
            <section>
              <span>เสร็จสิ้น</span>
              <strong>{barberQueueSummary.completed}</strong>
            </section>
          </div>

          <div className="barber-queue-layout">
            <section className="barber-timeline-panel">
              <div className="barber-section-heading">
                <div>
                  <h2>ตารางคิววันนี้</h2>
                  <small>{activeBarberQueue.length} คิวที่ต้องดูแล</small>
                </div>
              </div>

              {activeBarberQueue.length === 0 ? (
                <div className="barber-empty-state">
                  <strong>ยังไม่มีคิวในวันนี้</strong>
                  <small>ถ้ามีการนัดหมายเข้ามา รายการจะปรากฏตรงนี้อัตโนมัติหลัง Refresh</small>
                </div>
              ) : (
                <div className="barber-timeline-list">
                  {activeBarberQueue.map((booking) => (
                    <BarberAppointmentCard booking={booking} key={booking.id} onSelect={() => openBookingDetail(booking)} />
                  ))}
                </div>
              )}
            </section>

            <aside className="barber-side-panel">
              <h2>สรุปสถานะ</h2>
              <div className="barber-status-list">
                <span><i className="legend-dot pending" /> รอยืนยัน <strong>{barberQueueSummary.pending}</strong></span>
                <span><i className="legend-dot confirmed" /> มาถึงร้าน <strong>{barberQueueSummary.ready}</strong></span>
                <span><i className="legend-dot progress" /> กำลังให้บริการ/รอชำระ <strong>{barberQueueSummary.inProgress}</strong></span>
                <span><i className="legend-dot done" /> เสร็จสิ้น <strong>{barberQueueSummary.completed}</strong></span>
                <span><i className="legend-dot cancelled" /> ยกเลิก/ไม่มา <strong>{barberQueueSummary.cancelled}</strong></span>
              </div>

              {inactiveBarberQueue.length > 0 && (
                <section className="barber-muted-list">
                  <h3>รายการที่ไม่ต้องให้บริการ</h3>
                  {inactiveBarberQueue.map((booking) => (
                    <button key={booking.id} onClick={() => openBookingDetail(booking)} type="button">
                      <span>{formatTime(booking.startAt)} - {formatTime(booking.endAt)}</span>
                      <strong>{booking.customerName ?? 'Walk-in customer'}</strong>
                      <small>{statusLabels[booking.bookingStatus]}</small>
                    </button>
                  ))}
                </section>
              )}
            </aside>
          </div>
        </section>

        <nav className="barber-mobile-nav" aria-label="เมนูช่าง">
          <button className="active" type="button">
            <span>คิว</span>
            วันนี้
          </button>
          <button onClick={() => refreshBarberQueue(barberScheduleDate)} type="button">
            <span>รีเฟรช</span>
            งาน
          </button>
          <button onClick={() => setIsBarberProfileEditing(true)} type="button">
            <span>ตั้งค่า</span>
            โปรไฟล์
          </button>
        </nav>

        {isBarberProfileEditing && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBarberProfileEditor()
            }
          }}>
            <article className="detail-panel barber-profile-modal" role="dialog" aria-modal="true" aria-labelledby="barber-profile-title">
              <div className="booking-detail-header">
                <div>
                  <span className="modal-eyebrow">ตั้งค่าช่าง</span>
                  <h2 id="barber-profile-title">โปรไฟล์ของฉัน</h2>
                  <small className="booking-number-chip">{barberProfile?.email ?? auth.email}</small>
                </div>
                <button className="icon-button" aria-label="ปิดโปรไฟล์" onClick={closeBarberProfileEditor} type="button">
                  ×
                </button>
              </div>

              <form className="barber-profile-form barber-profile-modal-form" onSubmit={saveBarberProfile}>
                <div className="barber-profile-form-grid">
                  <label>
                    ชื่อที่แสดง
                    <input
                      value={barberProfileForm.fullName}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, fullName: event.target.value }))}
                    />
                  </label>
                  <label>
                    ชื่อเล่น
                    <input
                      value={barberProfileForm.nickname}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, nickname: event.target.value }))}
                    />
                  </label>
                  <label>
                    เบอร์โทร
                    <input
                      value={barberProfileForm.phoneNumber}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    />
                  </label>
                  <label>
                    ประสบการณ์ (ปี)
                    <input
                      min="0"
                      type="number"
                      value={barberProfileForm.experienceYears}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, experienceYears: event.target.value }))}
                    />
                  </label>
                  <label className="wide-field">
                    ความถนัด / จุดเด่น
                    <input
                      value={barberProfileForm.specialty}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, specialty: event.target.value }))}
                    />
                  </label>
                  <label className="wide-field">
                    Bio
                    <textarea
                      rows={4}
                      value={barberProfileForm.bio}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, bio: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="barber-profile-toggle-grid">
                  <label className="toggle-row">
                    <input
                      checked={barberProfileForm.isAvailable}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, isAvailable: event.target.checked }))}
                      type="checkbox"
                    />
                    <span>
                      <strong>พร้อมให้บริการ</strong>
                      <small>ใช้บอกสถานะหน้าคิวของร้าน</small>
                    </span>
                  </label>
                  <label className="toggle-row">
                    <input
                      checked={barberProfileForm.acceptsBooking}
                      onChange={(event) => setBarberProfileForm((current) => ({ ...current, acceptsBooking: event.target.checked }))}
                      type="checkbox"
                    />
                    <span>
                      <strong>รับจองออนไลน์</strong>
                      <small>เปิด/ปิดการรับคิวจากลูกค้า</small>
                    </span>
                  </label>
                </div>

                <div className="modal-action-row">
                  <button className="secondary" onClick={closeBarberProfileEditor} type="button">
                    ยกเลิก
                  </button>
                  <button disabled={isBusy} type="submit">
                    บันทึกโปรไฟล์
                  </button>
                </div>
              </form>
            </article>
          </div>
        )}

        {selectedBooking && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBookingDetail()
            }
          }}>
            <article className={`detail-panel booking-detail-modal status-modal-${selectedBooking.bookingStatus}`} role="dialog" aria-modal="true" aria-labelledby="barber-booking-detail-title">
              <div className="booking-detail-header">
                <div>
                  <span className="modal-eyebrow">รายละเอียดคิวของฉัน</span>
                  <h2 id="barber-booking-detail-title">{selectedBooking.customerName ?? 'Walk-in customer'}</h2>
                  <small className="booking-number-chip">เลขคิว {selectedBooking.bookingNumber}</small>
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
                  <dt>เวลา</dt>
                  <dd>{formatTime(selectedBooking.startAt)} - {formatTime(selectedBooking.endAt)}</dd>
                </div>
                <div>
                  <dt>ยอดชำระ</dt>
                  <dd>{formatMoney(selectedBooking.totalAmount)}</dd>
                </div>
                <div>
                  <dt>ระยะเวลา</dt>
                  <dd>{selectedBooking.services.reduce((total, service) => total + service.durationMinutes * service.quantity, 0)} นาที</dd>
                </div>
                <div>
                  <dt>สถานะชำระเงิน</dt>
                  <dd>{selectedBooking.paymentStatus}</dd>
                </div>
              </dl>

              <section className="booking-detail-services">
                <div className="booking-detail-section-title">
                  <h3>บริการที่ต้องทำ</h3>
                  <span>{selectedBooking.services.length} รายการ</span>
                </div>
                <ServiceList services={selectedBooking.services} />
              </section>

              {selectedBooking.cancelReason && (
                <section className="cancel-reason-note">
                  <div className="cancel-reason-icon" aria-hidden="true">!</div>
                  <div>
                    <span>เหตุผลการยกเลิก</span>
                    <strong>{selectedBooking.cancelReason}</strong>
                    {selectedBooking.cancelledAt && <small>ยกเลิกเมื่อ {formatDateTime(selectedBooking.cancelledAt)}</small>}
                  </div>
                </section>
              )}
            </article>
          </div>
        )}
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
            <span className="backoffice-user-avatar">{getInitials(auth.fullName)}</span>
            <div>
              <strong>{auth.fullName}</strong>
              <small>เข้าสู่ระบบเป็น {auth.role}</small>
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
                  <div className="schedule-date-picker-wrap" ref={scheduleDatePickerRef}>
                    <button
                      aria-expanded={isScheduleDatePickerOpen}
                      className={`schedule-date-picker ${isScheduleDatePickerOpen ? 'open' : ''}`}
                      onClick={openScheduleDatePicker}
                      type="button"
                    >
                      <span className="schedule-date-text">{formatToolbarDate(parseLocalDate(scheduleDate))}</span>
                      <span className="schedule-date-icon" aria-hidden="true">{isScheduleDatePickerOpen ? '▴' : '▾'}</span>
                    </button>
                    {isScheduleDatePickerOpen && (
                      <div className="schedule-calendar-popover">
                        <div className="schedule-calendar-header">
                          <button
                            aria-label="เดือนก่อนหน้า"
                            className="icon-button schedule-calendar-arrow previous"
                            onClick={() => setScheduleCalendarMonth(addMonths(scheduleCalendarMonth, -1))}
                            type="button"
                          />
                          <strong>{formatCalendarMonth(scheduleCalendarMonth)}</strong>
                          <button
                            aria-label="เดือนถัดไป"
                            className="icon-button schedule-calendar-arrow next"
                            onClick={() => setScheduleCalendarMonth(addMonths(scheduleCalendarMonth, 1))}
                            type="button"
                          />
                        </div>
                        <div className="schedule-calendar-weekdays" aria-hidden="true">
                          {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((day) => <span key={day}>{day}</span>)}
                        </div>
                        <div className="schedule-calendar-grid">
                          {scheduleCalendarDays.map((day) => (
                            <button
                              className={[
                                'schedule-calendar-day',
                                day.isOutsideMonth ? 'muted' : '',
                                day.dateValue === scheduleDate ? 'selected' : '',
                                day.dateValue === getTodayDate() ? 'today' : '',
                              ].filter(Boolean).join(' ')}
                              key={day.dateValue}
                              onClick={() => selectScheduleDate(day.dateValue)}
                              type="button"
                            >
                              {day.date.getDate()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                    if (isStaffBookingFormOpen) {
                      closeStaffBookingForm()
                      return
                    }

                    setStaffBookingContext('')
                    setStaffBookingBarberOptions([])
                    setStaffBookingCustomerSuggestions([])
                    setIsStaffBookingCustomerLookupOpen(false)
                    setStaffBookingForm(createEmptyStaffBookingForm('', getDefaultBookingDateTime(defaultBookingDate)))
                    setIsStaffBookingFormOpen(true)
                  }} type="button">
                    {isStaffBookingFormOpen ? 'ปิดฟอร์ม' : '+ เพิ่มการนัดหมาย'}
                  </button>
                </div>
              </div>
            </div>

            <div className="schedule-board">
              {barbers.length === 0 ? (
                <p className="empty-state">ยังไม่มีช่างที่เปิดรับจองออนไลน์</p>
              ) : (
                <>
                  <div className="schedule-fixed-grid" style={getScheduleBoardGridStyle(scheduleChairs)}>
                    <ScheduleTimeColumnHeader />
                    {scheduleChairs.map((chair) => (
                      <ChairScheduleHeader chair={chair} key={`${chair.id}-header`} onCreateBooking={openStaffBookingFormForChair} />
                    ))}
                  </div>
                  <div className="schedule-scroll-area">
                    <div className="schedule-scroll-grid" style={getScheduleBoardGridStyle(scheduleChairs)}>
                      <ScheduleTimeAxis />
                  {scheduleChairs.map((chair) => (
                    <ChairScheduleTimeline
                      bookings={queue.filter((booking) => chair.barbers.some(({ barber }) => booking.barberId === barber.id))}
                      chair={chair}
                      key={`${chair.id}-timeline`}
                      onSelectBooking={openBookingDetail}
                      selectedBookingId={selectedBooking?.id}
                    />
                  ))}
                    </div>
                  </div>
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
                  <button className="icon-button" aria-label="ปิดฟอร์มจองคิว" onClick={closeStaffBookingForm} type="button">
                    ×
                  </button>
                </div>

                {staffBookingContext && (
                  <div className="staff-booking-context">
                    <span>กำลังเพิ่มคิวให้</span>
                    <strong>{staffBookingContext}</strong>
                  </div>
                )}

                <section className="staff-booking-card">
                  <h4>ข้อมูลลูกค้า</h4>
                  <div className="staff-booking-field-grid staff-customer-field-grid">
                    <label>
                      ชื่อลูกค้า
                      <input
                        placeholder="กรอกชื่อลูกค้า"
                        value={staffBookingForm.guestName}
                        onChange={(event) => setStaffBookingForm({ ...staffBookingForm, customerId: '', guestName: event.target.value })}
                      />
                    </label>
                    <label className="staff-customer-lookup-field">
                      เบอร์โทร
                      <input
                        placeholder="08X-XXX-XXXX"
                        value={staffBookingForm.guestPhoneNumber}
                        onChange={(event) => setStaffBookingForm({ ...staffBookingForm, customerId: '', guestPhoneNumber: event.target.value })}
                        onFocus={() => setIsStaffBookingCustomerLookupOpen(staffBookingCustomerSuggestions.length > 0)}
                      />
                      {staffBookingForm.customerId && (
                        <span className="staff-customer-selected">เลือกสมาชิกแล้ว</span>
                      )}
                      {isStaffBookingCustomerLookupOpen && staffBookingCustomerSuggestions.length > 0 && (
                        <div className="staff-customer-suggestions">
                          {staffBookingCustomerSuggestions.map((customer) => (
                            <button key={customer.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectStaffBookingCustomer(customer)} type="button">
                              <strong>{customer.fullName}</strong>
                              <span>{customer.phoneNumber}</span>
                              <small>{customer.email}</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </label>
                    <label>
                      Email
                      <input
                        placeholder="example@email.com"
                        value={staffBookingForm.guestEmail}
                        onChange={(event) => setStaffBookingForm({ ...staffBookingForm, customerId: '', guestEmail: event.target.value })}
                      />
                    </label>
                  </div>
                </section>

                <section className="staff-booking-card">
                  <h4>เลือกช่างและเวลา</h4>
                  <div className={`staff-booking-field-grid ${staffBookingContext ? 'staff-booking-field-grid-locked-date' : ''}`}>
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
                    {!staffBookingContext && (
                      <label>
                        วันที่
                        <input
                          min={getTodayDate()}
                          type="date"
                          value={staffBookingForm.startAt.slice(0, 10)}
                          onChange={(event) => setStaffBookingForm({
                            ...staffBookingForm,
                            startAt: clampDateTimeToMinimum(buildBookingDateTime(event.target.value, getBookingHourValue(staffBookingForm.startAt))),
                          })}
                        />
                      </label>
                    )}
                    <label>
                      เวลาเริ่ม
                      <select
                        value={getBookingHourValue(staffBookingForm.startAt)}
                        onChange={(event) => setStaffBookingForm({
                          ...staffBookingForm,
                          startAt: clampDateTimeToMinimum(buildBookingDateTime(staffBookingForm.startAt.slice(0, 10), event.target.value)),
                        })}
                      >
                        {bookingStartHours.map((hour) => (
                          <option key={hour} value={String(hour).padStart(2, '0')}>
                            {String(hour).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      หมายเหตุ
                      <input
                        placeholder="เพิ่มเติม"
                        value={staffBookingForm.customerNote}
                        onChange={(event) => setStaffBookingForm({ ...staffBookingForm, customerNote: event.target.value })}
                      />
                    </label>
                  </div>
                </section>

                <section className="staff-booking-card staff-booking-services">
                  <div className="staff-booking-section-title">
                    <h4>บริการ</h4>
                    <span>{staffBookingForm.serviceIds.length} รายการที่เลือก</span>
                  </div>
                  {services.length === 0 ? (
                    <small>ยังไม่มีบริการ active</small>
                  ) : (
                    <div className="staff-service-groups">
                      {staffBookingServiceGroups.map((group) => (
                        <section className="staff-service-group" key={group.title}>
                          <div className="staff-service-group-title">
                            <div>
                              <strong>{group.title}</strong>
                              <small>{group.description}</small>
                            </div>
                            <span>{group.services.length} รายการ</span>
                          </div>
                          <div className="staff-service-grid">
                            {group.services.map((service) => (
                              <label className={staffBookingForm.serviceIds.includes(service.id) ? 'staff-service-card selected' : 'staff-service-card'} key={service.id}>
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
                                <span>
                                  <strong>{service.name}</strong>
                                  <small>{service.durationMinutes} นาที</small>
                                </span>
                                <b>{formatMoney(service.price)}</b>
                              </label>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </section>

                <div className="action-row">
                  <button className="secondary" onClick={closeStaffBookingForm} type="button">
                    ยกเลิก
                  </button>
                  <button disabled={isBusy} type="submit">
                    บันทึกการนัดหมาย
                  </button>
                </div>
              </form>
            </div>
          )}

          <aside className="detail-panel schedule-detail-panel">
            <section className="schedule-side-summary">
              <h3>สรุปวันที่เลือก</h3>
              <div className="summary-highlight">
                <span>คิวทั้งหมด</span>
                <strong>{queueSummary.total}</strong>
              </div>
              <div className="summary-highlight">
                <span>รายได้ที่รับแล้ว</span>
                <strong>{formatMoney(queueSummary.revenue)}</strong>
              </div>
            </section>

            <section className="status-legend">
              <h3>สถานะคิว</h3>
              <span><i className="legend-dot pending" /> รอยืนยัน <strong>{queueSummary.pending}</strong></span>
              <span><i className="legend-dot confirmed" /> มาถึงร้าน <strong>{queueSummary.confirmed}</strong></span>
              <span><i className="legend-dot progress" /> กำลังให้บริการ/รอชำระ <strong>{queueSummary.inProgress}</strong></span>
              <span><i className="legend-dot done" /> เสร็จสิ้น <strong>{queueSummary.completed}</strong></span>
              <span><i className="legend-dot cancelled" /> ยกเลิก <strong>{queueSummary.cancelled}</strong></span>
            </section>
          </aside>

          {selectedBooking && (
            <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeBookingDetail()
              }
            }}>
              <article className={`detail-panel booking-detail-modal status-modal-${selectedBooking.bookingStatus}`} role="dialog" aria-modal="true" aria-labelledby="booking-detail-title">
                <div className="booking-detail-header">
                  <div>
                    <span className="modal-eyebrow">รายละเอียดคิว</span>
                    <h2 id="booking-detail-title">{selectedBooking.customerName ?? 'Walk-in customer'}</h2>
                    <small className="booking-number-chip">เลขคิว {selectedBooking.bookingNumber}</small>
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

                {selectedBooking.cancelReason && (
                  <section className="cancel-reason-note">
                    <div className="cancel-reason-icon" aria-hidden="true">!</div>
                    <div>
                      <span>เหตุผลการยกเลิก</span>
                      <strong>{selectedBooking.cancelReason}</strong>
                      {selectedBooking.cancelledAt && <small>ยกเลิกเมื่อ {formatDateTime(selectedBooking.cancelledAt)}</small>}
                    </div>
                  </section>
                )}

                {selectedBookingHistory.length > 1 && (
                  <section className="booking-history-box">
                    <div className="booking-detail-section-title">
                      <h3>ประวัติในช่วงเวลานี้</h3>
                      <span>{selectedBookingHistory.length} รายการ</span>
                    </div>
                    <div className="booking-history-list">
                      {selectedBookingHistory.map((booking, index) => (
                        <button
                          className={booking.id === selectedBooking.id ? 'selected' : ''}
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          type="button"
                        >
                          <span>{index + 1}</span>
                          <div>
                            <strong>{booking.customerName ?? 'Walk-in customer'}</strong>
                            <small>
                              {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                              {booking.cancelReason ? ` / ${booking.cancelReason}` : ''}
                            </small>
                          </div>
                          <em>{statusLabels[booking.bookingStatus] ?? booking.bookingStatus}</em>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

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
                  {cancellableStatuses.includes(selectedBooking.bookingStatus) && (
                    <button
                      className="danger cancel-booking-button"
                      disabled={isBusy}
                      onClick={() => setIsCancelBookingOpen((current) => !current)}
                      type="button"
                    >
                      ยกเลิกคิว
                    </button>
                  )}
                </div>

                {isCancelBookingOpen && selectedBooking.bookingStatus !== 'Cancelled' && (
                  <section className="cancel-booking-box">
                    <div>
                      <h3>ยืนยันการยกเลิกคิว</h3>
                      <p>คิวนี้จะถูกเปลี่ยนเป็นสถานะยกเลิก และยังคงอยู่ในตารางเพื่อให้ร้านตรวจสอบย้อนหลังได้</p>
                    </div>
                    <div className="cancel-reason-options" role="radiogroup" aria-label="เหตุผลการยกเลิก">
                      {cancelReasonOptions.map((reason) => (
                        <button
                          className={cancelReason === reason ? 'selected' : ''}
                          key={reason}
                          onClick={() => setCancelReason(reason)}
                          type="button"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <div className="cancel-booking-actions">
                      <button className="secondary" disabled={isBusy} onClick={() => setIsCancelBookingOpen(false)} type="button">
                        กลับไปก่อน
                      </button>
                      <button className="danger solid" disabled={isBusy || !cancelReason} onClick={cancelBooking} type="button">
                        ยืนยันยกเลิกคิว
                      </button>
                    </div>
                  </section>
                )}

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
          <section className="master-roster-panel">
            <div className="panel-heading">
              <div>
                <h2>Master Roster</h2>
                <p className="muted">ภาพรวมวันทำงาน เก้าอี้ประจำ และช่างสำรองของร้าน</p>
              </div>
              <button
                disabled={isBusy}
                onClick={() => {
                  void refreshBarbers()
                  void refreshChairManagement()
                }}
                type="button"
              >
                Refresh
              </button>
            </div>

            <div className="roster-table">
              <div className="roster-row roster-head">
                <span>ช่าง</span>
                {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((day) => <span key={day}>{day}</span>)}
              </div>
              {barbers.map((barber) => {
                const schedule = barberSchedules[barber.id]
                return (
                  <div className="roster-row" key={barber.id}>
                    <div className="roster-barber">
                      <span className="mini-avatar">{getInitials(barber.nickname || barber.fullName || 'ช')}</span>
                      <div>
                        <strong>{barber.fullName}</strong>
                        <small>{barber.specialty ?? 'ยังไม่ระบุความถนัด'}</small>
                      </div>
                    </div>
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const workingHour = schedule?.workingHours.find((item) => item.dayOfWeek === day)
                      const isWorkingDay = workingHour?.isWorkingDay ?? false
                      return (
                        <button
                          aria-label={`${isWorkingDay ? 'ปิด' : 'เปิด'}วันทำงาน ${barber.fullName}`}
                          className={isWorkingDay ? 'roster-check active' : 'roster-check'}
                          disabled={isBusy}
                          key={day}
                          onClick={() => void toggleBarberWorkingDay(barber, day)}
                          title={isWorkingDay ? 'กดเพื่อปิดวันทำงาน' : 'กดเพื่อเปิดวันทำงาน'}
                          type="button"
                        >
                          {isWorkingDay ? '✓' : '×'}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            <div className="assignment-dashboard">
              <section>
                <div className="section-heading-inline">
                  <h3>Chair Assignments</h3>
                  <small>{formatDateOnly(scheduleDate)}</small>
                </div>
                <div className="chair-card-grid">
                  {chairs.map((chair) => {
                    const primaryAssignments = activePrimaryAssignmentsByChair.get(chair.id) ?? []
                    const primaryAssignment = primaryAssignments[0]
                    const isShared = isSharedChair(chair, primaryAssignments, sharedChairIds)
                    const sharedBarberOptions = getSharedChairBarberOptions(chair, barbers)
                    return (
                      <article className={isShared ? 'chair-roster-card shared' : 'chair-roster-card'} key={chair.id}>
                        <div className="chair-icon">▣</div>
                        <div>
                          <div className="chair-title-row">
                            <strong>{chair.name}</strong>
                            <button
                              className={isShared ? 'chair-share-toggle active' : 'chair-share-toggle'}
                              disabled={isBusy}
                              onClick={() => void toggleChairSharing(chair, isShared)}
                              type="button"
                            >
                              {isShared ? 'แชร์อยู่' : 'เปิดแชร์'}
                            </button>
                          </div>
                          <small>{chair.note ?? 'ไม่มีหมายเหตุ'}</small>
                          {isShared ? (
                            <div className="shared-chair-picker">
                              <label>
                                ช่างหลัก
                                <select
                                  value={primaryAssignments[0]?.barberId ?? ''}
                                  onChange={(event) => changeSharedPrimaryChairAssignment(chair, event.target.value)}
                                >
                                  <option value="">เลือกช่างหลัก</option>
                                  {sharedBarberOptions.map((barber) => (
                                    <option key={barber.id} value={barber.id}>
                                      {barber.fullName}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                ช่างรอง
                                <select
                                  value={primaryAssignments[1]?.barberId ?? ''}
                                  onChange={(event) => changeSharedSecondaryChairAssignment(chair, event.target.value)}
                                >
                                  <option value="">ไม่ระบุช่างรอง</option>
                                  {sharedBarberOptions.map((barber) => (
                                    <option key={barber.id} value={barber.id}>
                                      {barber.fullName}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          ) : (
                            <select
                              className="single-chair-select"
                              value={primaryAssignment?.barberId ?? ''}
                              onChange={(event) => void savePrimaryChairAssignment(chair, event.target.value)}
                            >
                              <option value="">เลือกช่างประจำ</option>
                              {barbers.map((barber) => (
                                <option key={barber.id} value={barber.id}>
                                  {barber.fullName}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section>
                <div className="section-heading-inline">
                  <h3>Standby Roster</h3>
                  <small>{standbyBarbers.length} คน</small>
                </div>
                <div className="standby-card-list">
                  {standbyBarbers.length === 0 ? (
                    <p className="empty-state">ยังไม่มีช่างสำรอง</p>
                  ) : (
                    standbyBarbers.map((barber) => {
                      const assignedChairs = activeStandbyAssignments
                        .filter((assignment) => assignment.barberId === barber.id)
                        .map((assignment) => assignment.chairName)
                      return (
                        <button className="standby-roster-card" key={barber.id} onClick={() => openStandbyModal(barber.id)} type="button">
                          <span className="mini-avatar">{getInitials(barber.nickname || barber.fullName || 'ช')}</span>
                          <span>
                            <strong>{barber.fullName}</strong>
                            <small>{assignedChairs.join(', ') || 'ยังไม่เลือกเก้าอี้'}</small>
                          </span>
                          <b>Standby</b>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>
            </div>
          </section>

          <div className="account-list staff-directory">
            <div className="panel-heading">
              <div>
                <h2>รายชื่อพนักงาน</h2>
                <p className="muted">จัดการบัญชีและสถานะพนักงาน</p>
              </div>
              <div className="header-actions">
                <button className="secondary" disabled={isBusy} onClick={refreshStaffAccounts} type="button">
                  Refresh
                </button>
                <button disabled={isBusy} onClick={() => setIsStaffModalOpen(true)} type="button">
                  + เพิ่มพนักงาน
                </button>
              </div>
            </div>

            {staffAccounts.length === 0 ? (
              <p className="empty-state">ยังไม่มีบัญชีพนักงาน</p>
            ) : (
              staffAccounts.map((staff) => (
                <article className="account-card staff-account-row" key={staff.id}>
                  <div className="staff-card-summary">
                    <div className="staff-person-cell">
                      <strong>{staff.fullName}</strong>
                      {staff.role === 'Barber' && (
                        <small>
                          {staff.specialty ?? 'ยังไม่ระบุความถนัด'} / {formatEmploymentTenure(staff.startDate)}
                        </small>
                      )}
                    </div>
                    <div className="staff-badge-cell">
                      <span className="staff-role-pill">{staff.role}</span>
                      <span className={staff.accountStatus === 'Active' ? 'status-pill' : 'status-pill muted-pill'}>
                        {staff.accountStatus}
                      </span>
                    </div>
                    <div className="staff-contact-cell">
                      <small>{staff.email}</small>
                      <small>{staff.phoneNumber}</small>
                    </div>
                    <div className="account-actions">
                      <button className="secondary" disabled={isBusy} onClick={() => startEditingStaff(staff)} type="button">
                        แก้ไข
                      </button>
                      <button
                        className="secondary"
                        disabled={isBusy}
                        onClick={() => {
                          setResetPasswordStaffId(staff.id)
                          setEditingStaffId(null)
                          setResetPassword('StaffPassword123!')
                        }}
                        type="button"
                      >
                        รีเซ็ตรหัส
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

                </article>
              ))
            )}
          </div>
        </section>
        )}
      </section>

      {isStaffModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="staff-account-modal" onSubmit={saveStaffAccount}>
            <div className="modal-header compact">
              <div>
                <span className="eyebrow">Staff Account</span>
                <h2>เพิ่มพนักงาน</h2>
              </div>
              <button className="modal-close" onClick={() => setIsStaffModalOpen(false)} type="button">
                ×
              </button>
            </div>

            <div className="staff-modal-grid">
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
              <label>
                หมายเหตุ
                <input value={staffForm.note} onChange={(event) => setStaffForm({ ...staffForm, note: event.target.value })} />
              </label>
              {staffForm.role === 'Barber' && (
                <>
                  <label>
                    ความถนัด
                    <input value={staffForm.specialty} onChange={(event) => setStaffForm({ ...staffForm, specialty: event.target.value })} />
                  </label>
                  <div className="staff-derived-field">
                    <span>อายุงาน</span>
                    <strong>{formatEmploymentTenure(staffForm.startDate)}</strong>
                    <small>คำนวณจากวันเริ่มงาน</small>
                  </div>
                  <label className="staff-modal-wide">
                    Bio
                    <input value={staffForm.bio} onChange={(event) => setStaffForm({ ...staffForm, bio: event.target.value })} />
                  </label>
                </>
              )}
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setIsStaffModalOpen(false)} type="button">
                ยกเลิก
              </button>
              <button disabled={isBusy} type="submit">
                สร้างบัญชีพนักงาน
              </button>
            </div>
          </form>
        </div>
      )}

      {editingStaffId && (() => {
        const staff = staffAccounts.find((item) => item.id === editingStaffId)
        if (!staff) return null

        return (
          <div className="modal-backdrop" role="presentation">
            <form className="staff-account-modal" onSubmit={(event) => saveStaffEdit(event, staff)}>
              <div className="modal-header compact">
                <div>
                  <span className="eyebrow">Edit Staff</span>
                  <h2>แก้ไขพนักงาน</h2>
                  <p className="muted">{staff.fullName}</p>
                </div>
                <button className="modal-close" onClick={() => setEditingStaffId(null)} type="button">
                  ×
                </button>
              </div>

              <div className="staff-modal-grid">
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
                    <div className="staff-derived-field">
                      <span>อายุงาน</span>
                      <strong>{formatEmploymentTenure(editStaffForm.startDate)}</strong>
                      <small>คำนวณจากวันเริ่มงาน ไม่ต้องกรอกเอง</small>
                    </div>
                    <label className="staff-modal-wide">
                      Bio
                      <input value={editStaffForm.bio} onChange={(event) => setEditStaffForm({ ...editStaffForm, bio: event.target.value })} />
                    </label>
                  </>
                )}

                <label className="staff-modal-wide">
                  หมายเหตุ
                  <input value={editStaffForm.note} onChange={(event) => setEditStaffForm({ ...editStaffForm, note: event.target.value })} />
                </label>
              </div>

              <div className="modal-actions">
                <button className="secondary" onClick={() => setEditingStaffId(null)} type="button">
                  ยกเลิก
                </button>
                <button disabled={isBusy} type="submit">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        )
      })()}

      {resetPasswordStaffId && (() => {
        const staff = staffAccounts.find((item) => item.id === resetPasswordStaffId)
        if (!staff) return null

        return (
          <div className="modal-backdrop" role="presentation">
            <form className="staff-account-modal password-reset-modal" onSubmit={(event) => saveStaffPassword(event, staff)}>
              <div className="modal-header compact">
                <div>
                  <span className="eyebrow">Reset Password</span>
                  <h2>ตั้งรหัสผ่านใหม่</h2>
                  <p className="muted">{staff.fullName}</p>
                </div>
                <button className="modal-close" onClick={() => setResetPasswordStaffId(null)} type="button">
                  ×
                </button>
              </div>

              <div className="staff-modal-grid">
                <label className="staff-modal-wide">
                  Password ใหม่
                  <PasswordInput
                    isVisible={isResetPasswordVisible}
                    onChange={setResetPassword}
                    onToggleVisibility={() => setIsResetPasswordVisible((current) => !current)}
                    value={resetPassword}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button className="secondary" onClick={() => setResetPasswordStaffId(null)} type="button">
                  ยกเลิก
                </button>
                <button disabled={isBusy} type="submit">
                  บันทึก Password ใหม่
                </button>
              </div>
            </form>
          </div>
        )
      })()}

      {standbyModalBarberId && (
        <div className="modal-backdrop" role="presentation">
          <section className="standby-modal">
            <div className="modal-header compact">
              <div>
                <span className="eyebrow">Standby Roster</span>
                <h2>{barbers.find((barber) => barber.id === standbyModalBarberId)?.fullName ?? 'ช่างสำรอง'}</h2>
              </div>
              <button className="modal-close" onClick={() => setStandbyModalBarberId(null)} type="button">
                ×
              </button>
            </div>
            <p className="muted">เลือกเก้าอี้ที่ช่างคนนี้สามารถเข้าแทนเมื่อช่างประจำหยุด</p>
            <div className="standby-chair-options">
              {chairs.map((chair) => (
                <label className="standby-chair-option" key={chair.id}>
                  <input
                    checked={standbyModalChairIds.includes(chair.id)}
                    onChange={() => toggleStandbyChair(chair.id)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{chair.name}</strong>
                    <small>{chair.note ?? 'ไม่มีหมายเหตุ'}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setStandbyModalBarberId(null)} type="button">
                ยกเลิก
              </button>
              <button disabled={isBusy} onClick={() => void saveStandbyAssignments()} type="button">
                บันทึก Standby
              </button>
            </div>
          </section>
        </div>
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

function ScheduleTimeColumnHeader() {
  return <div className="schedule-time-column-header">เวลา</div>
}

function ScheduleTimeAxis() {
  return (
    <aside className="schedule-time-axis" aria-label="เวลา">
      {Array.from({ length: scheduleTimelineEndHour - scheduleTimelineStartHour + 1 }, (_, index) => {
        const hour = scheduleTimelineStartHour + index

        return (
          <span key={hour} style={{ top: `${index * scheduleHourHeightPx + 6}px` }}>
            {String(hour).padStart(2, '0')}:00
          </span>
        )
      })}
    </aside>
  )
}

function ChairScheduleHeader({
  chair,
  onCreateBooking,
}: {
  chair: ScheduleChair
  onCreateBooking: (chair: ScheduleChair) => void
}) {
  const headerClassName = [
    'barber-column-header',
    chair.isWorkingToday ? '' : 'off-day',
    chair.isShared ? 'shared-chair' : '',
  ].filter(Boolean).join(' ')

  return (
    <header className={headerClassName}>
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
      {chair.isWorkingToday && (
        <button className="schedule-add-booking" onClick={() => onCreateBooking(chair)} type="button">
          + จอง
        </button>
      )}
    </header>
  )
}

function ChairScheduleTimeline({
  bookings,
  chair,
  onSelectBooking,
  selectedBookingId,
}: {
  chair: ScheduleChair
  bookings: Booking[]
  onSelectBooking: (booking: Booking, history?: Booking[]) => void
  selectedBookingId?: string
}) {
  const sortedBookings = [...bookings].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())
  const activeBookings = sortedBookings.filter((booking) => booking.bookingStatus !== 'Cancelled')
  const cancelledBookings = sortedBookings.filter((booking) => booking.bookingStatus === 'Cancelled')
  const cancelledBookingGroups = groupSameTimelineSlots(cancelledBookings).map(sortCancelledHistory)
  const layeredCancelledBookingGroups = cancelledBookingGroups
    .map((group) => {
      const anchorBooking = group[0]
      if (!anchorBooking) return []

      const hasActiveBookingInSlot = activeBookings.some((activeBooking) => isSameTimelineSlot(activeBooking, anchorBooking))
      return hasActiveBookingInSlot ? group : group.slice(0, -1)
    })
    .filter((group) => group.length > 0)
  const standaloneCancelledBookingGroups = cancelledBookingGroups
    .filter((group) => {
      const anchorBooking = group[0]
      if (!anchorBooking) return false

      const hasActiveBookingInSlot = activeBookings.some((activeBooking) => isSameTimelineSlot(activeBooking, anchorBooking))
      return !hasActiveBookingInSlot
    })
  const columnClassName = [
    'barber-column',
    'barber-column-timeline',
    chair.isWorkingToday ? '' : 'off-day',
    chair.isShared ? 'shared-chair' : '',
  ].filter(Boolean).join(' ')

  return (
    <article className={columnClassName}>
      <div className="barber-column-body">
        <div className="schedule-timeline">
          <div className="schedule-hour-lines" aria-hidden="true">
            {Array.from({ length: scheduleTimelineEndHour - scheduleTimelineStartHour + 1 }, (_, index) => (
              <span key={scheduleTimelineStartHour + index} />
            ))}
          </div>
        {layeredCancelledBookingGroups.length > 0 && (
          <>
            {layeredCancelledBookingGroups.map((group) => {
              const anchorBooking = group[0]
              if (!anchorBooking) return null

              const fullHistory = cancelledBookingGroups.find((candidateGroup) =>
                candidateGroup.some((candidate) => isSameTimelineSlot(candidate, anchorBooking)),
              ) ?? group
              const placement = getCancelledStackTimelinePlacement(anchorBooking)
              const hiddenCount = group.length

              return (
                <div
                  className="cancelled-stack-hover-zone"
                  key={`stack-${anchorBooking.startAt}-${anchorBooking.endAt}`}
                  style={{ ...placement, zIndex: getCancelledStackLayerIndex(anchorBooking) }}
                >
                  <button
                    aria-label={`ดูประวัติคิวที่ยกเลิก ${anchorBooking.customerName ?? 'Walk-in customer'}`}
                    className="cancelled-stack-card"
                    onClick={() => onSelectBooking(anchorBooking, fullHistory)}
                    type="button"
                  >
                    <span className="cancelled-stack-row">
                      <span>{formatTime(anchorBooking.startAt)} - {formatTime(anchorBooking.endAt)}</span>
                      <strong>{statusLabels[anchorBooking.bookingStatus]}</strong>
                    </span>
                    <small>{anchorBooking.customerName ?? 'Walk-in customer'}</small>
                    {hiddenCount > 1 && <span className="cancelled-stack-count">+{hiddenCount - 1}</span>}
                  </button>
                </div>
              )
            })}
          </>
        )}
        {activeBookings.length > 0 && (
          <>
            {activeBookings.map((booking) => {
              const placement = getBookingTimelinePlacement(booking)
              const hasCancelledHistory = cancelledBookings.some((cancelledBooking) => isSameTimelineSlot(booking, cancelledBooking))

              return (
                <button
                  className={[
                    selectedBookingId === booking.id ? 'schedule-card selected' : `schedule-card status-border-${booking.bookingStatus}`,
                    hasCancelledHistory ? 'has-cancelled-history' : '',
                  ].filter(Boolean).join(' ')}
                  key={booking.id}
                  onClick={() => onSelectBooking(booking)}
                  style={{ ...placement, zIndex: getBookingLayerIndex(booking) }}
                  type="button"
                  >
                  <span className="schedule-time">{formatTime(booking.startAt)} - {formatTime(booking.endAt)}</span>
                  <strong>{booking.customerName ?? 'Walk-in customer'}</strong>
                  <small>{booking.services.map((service) => service.serviceName).join(' + ')}</small>
                  <span className={`schedule-card-status status-${booking.bookingStatus}`}>{statusLabels[booking.bookingStatus]}</span>
                </button>
              )
            })}
          </>
        )}
        {standaloneCancelledBookingGroups.length > 0 && (
          <div className="cancelled-booking-layer" aria-label="ประวัติคิวที่ยกเลิก">
            {standaloneCancelledBookingGroups.map((group) => {
              const booking = group.at(-1)
              if (!booking) return null

              const placement = getBookingTimelinePlacement(booking)

              return (
                <button
                  className={selectedBookingId === booking.id ? 'cancelled-schedule-card selected' : 'cancelled-schedule-card'}
                  key={booking.id}
                  onClick={() => onSelectBooking(booking, group)}
                  style={{ ...placement, zIndex: getBookingLayerIndex(booking) }}
                  type="button"
                >
                  <span className="schedule-time">{formatTime(booking.startAt)} - {formatTime(booking.endAt)}</span>
                  <strong>{booking.customerName ?? 'Walk-in customer'}</strong>
                  <small>{booking.services.map((service) => service.serviceName).join(' + ')}</small>
                  <span className={`schedule-card-status status-${booking.bookingStatus}`}>{statusLabels[booking.bookingStatus]}</span>
                </button>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </article>
  )
}

function isSameTimelineSlot(left: Booking, right: Booking) {
  return left.startAt === right.startAt && left.endAt === right.endAt
}

function groupSameTimelineSlots(bookings: Booking[]) {
  const groups: Booking[][] = []

  bookings.forEach((booking) => {
    const group = groups.find((candidateGroup) => candidateGroup.some((candidate) => isSameTimelineSlot(candidate, booking)))

    if (group) {
      group.push(booking)
      return
    }

    groups.push([booking])
  })

  return groups
}

function sortCancelledHistory(bookings: Booking[]) {
  return [...bookings].sort((left, right) => {
    const leftTime = left.cancelledAt ? new Date(left.cancelledAt).getTime() : 0
    const rightTime = right.cancelledAt ? new Date(right.cancelledAt).getTime() : 0

    if (leftTime !== rightTime) return leftTime - rightTime

    return left.bookingNumber.localeCompare(right.bookingNumber)
  })
}

function getTimelineStartOffsetMinutes(booking: Booking) {
  const start = new Date(booking.startAt)
  return Math.max(0, start.getHours() * 60 + start.getMinutes() - scheduleTimelineStartHour * 60)
}

function getBookingLayerIndex(booking: Booking) {
  return 20 + getTimelineStartOffsetMinutes(booking) * 2 + 1
}

function getCancelledStackLayerIndex(booking: Booking) {
  return 20 + getTimelineStartOffsetMinutes(booking) * 2
}

function getCancelledStackTimelinePlacement(booking: Booking): CSSProperties {
  const start = new Date(booking.startAt)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const offsetMinutes = Math.max(0, startMinutes - scheduleTimelineStartHour * 60)
  const top = (offsetMinutes / 60) * scheduleHourHeightPx

  return {
    top: `${Math.max(0, top - 46)}px`,
  }
}

function getBookingTimelinePlacement(booking: Booking, stackIndex = 0): CSSProperties {
  const start = new Date(booking.startAt)
  const end = new Date(booking.endAt)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const offsetMinutes = Math.max(0, startMinutes - scheduleTimelineStartHour * 60)
  const durationMinutes = Math.max(30, Math.min(scheduleTimelineMinutes - offsetMinutes, endMinutes - startMinutes))
  const top = (offsetMinutes / 60) * scheduleHourHeightPx + 2 + stackIndex * 12
  const height = Math.max(74, (durationMinutes / 60) * scheduleHourHeightPx - 4)

  return {
    top: `${top}px`,
    height: `${height}px`,
  }
}

function groupServicesForBooking(services: Service[]): ServiceGroup[] {
  const definitions = [
    {
      title: 'Dev / ทดสอบ',
      description: 'ข้อมูลทดสอบระหว่างพัฒนา',
      match: (name: string) => name.startsWith('dev '),
    },
    {
      title: 'ตัดผม',
      description: 'ตัดผมชาย หญิง สกินเฮด และวอลลุ่ม',
      match: (name: string) => name.includes('ตัดผม') || name.includes('สกินเฮด') || name.includes('ตัดวอลลุ่ม'),
    },
    {
      title: 'ซอยกรรไกร',
      description: 'งานซอยกรรไกรตามความยาวผม',
      match: (name: string) => name.includes('ซอยกรรไกร'),
    },
    {
      title: 'ดัด / ยืด / แพร์ม',
      description: 'ดัด ยืด ดาวน์แพร์ม อัพดาวน์แพร์ม และฟอยล์',
      match: (name: string) => name.includes('ดัด') || name.includes('ยืด') || name.includes('แพร์ม') || name.includes('ฟอยล์') || name.includes('ฟรอยด์'),
    },
    {
      title: 'ทำสี / เคมี',
      description: 'ทำสี ปิดผมขาว แฟชั่น และงานเคมีอื่นๆ',
      match: (name: string) => name.includes('ทำสี') || name.includes('เคมี'),
    },
  ]

  const groups = definitions.map((definition) => ({
    title: definition.title,
    description: definition.description,
    services: services.filter((service) => definition.match(service.name.trim().toLowerCase())),
  }))

  const groupedServiceIds = new Set(groups.flatMap((group) => group.services.map((service) => service.id)))
  const uncategorizedServices = services.filter((service) => !groupedServiceIds.has(service.id))

  if (uncategorizedServices.length > 0) {
    groups.push({
      title: 'อื่นๆ',
      description: 'บริการที่ยังไม่ถูกจัดหมวด',
      services: uncategorizedServices,
    })
  }

  return groups.filter((group) => group.services.length > 0)
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

function BarberAppointmentCard({
  booking,
  onSelect,
}: {
  booking: Booking
  onSelect: () => void
}) {
  const services = booking.services.map((service) => service.serviceName).join(' + ')

  return (
    <button className={`barber-appointment-card status-border-${booking.bookingStatus}`} onClick={onSelect} type="button">
      <div className="barber-appointment-time">
        <strong>{formatTime(booking.startAt)} - {formatTime(booking.endAt)}</strong>
        <span className={`status-pill status-${booking.bookingStatus}`}>
          {statusLabels[booking.bookingStatus] ?? booking.bookingStatus}
        </span>
      </div>
      <div className="barber-appointment-main">
        <span className="barber-customer-avatar">{getInitials(booking.customerName ?? booking.bookingNumber)}</span>
        <div>
          <strong>{booking.customerName ?? 'Walk-in customer'}</strong>
          <small>{services || booking.bookingNumber}</small>
        </div>
      </div>
      <div className="barber-appointment-footer">
        <span>{booking.services.length} รายการ</span>
        <strong>{formatMoney(booking.totalAmount)}</strong>
      </div>
    </button>
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

function getExperienceYearsFromStartDate(value: string | null) {
  if (!value) return null

  const startDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(startDate.getTime())) return null

  const today = new Date()
  let years = today.getFullYear() - startDate.getFullYear()
  const hasNotReachedAnniversary =
    today.getMonth() < startDate.getMonth() ||
    (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate())

  if (hasNotReachedAnniversary) {
    years -= 1
  }

  return Math.max(0, years)
}

function formatEmploymentTenure(value: string | null) {
  if (!value) return 'ยังไม่ระบุวันเริ่มงาน'

  const startDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(startDate.getTime())) return 'วันเริ่มงานไม่ถูกต้อง'

  const today = new Date()
  if (startDate > today) return 'ยังไม่เริ่มงาน'

  let years = today.getFullYear() - startDate.getFullYear()
  let months = today.getMonth() - startDate.getMonth()

  if (today.getDate() < startDate.getDate()) {
    months -= 1
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  years = Math.max(0, years)
  months = Math.max(0, months)

  if (years === 0 && months === 0) return 'น้อยกว่า 1 เดือน'
  if (years === 0) return `${months} เดือน`
  if (months === 0) return `${years} ปี`
  return `${years} ปี ${months} เดือน`
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

function formatDateOnly(value: string) {
  return formatToolbarDate(parseLocalDate(value))
}

function getDefaultChairConfigByOrder(order: number) {
  return defaultChairConfigs.find((config) => config.order === order)
}

function getAssignmentRoleOrder(assignment: ChairAssignment) {
  if (assignment.note === 'ช่างหลัก') return 0
  if (assignment.note === 'ช่างรอง') return 1

  return 50
}

function getConfiguredBarberOrder(
  chairOrder: number,
  identity: { id?: string; email?: string; fullName?: string },
) {
  const defaultConfig = getDefaultChairConfigByOrder(chairOrder)

  if (!defaultConfig) {
    return 50
  }

  if (identity.id) {
    const idIndex = defaultConfig.barberIds.indexOf(identity.id)
    if (idIndex >= 0) return idIndex
  }

  if (identity.email) {
    const emailIndex = defaultConfig.barberEmails.findIndex((email) => (
      normalizeIdentityValue(email) === normalizeIdentityValue(identity.email ?? '')
    ))
    if (emailIndex >= 0) return emailIndex
  }

  if (identity.fullName) {
    const nameIndex = defaultConfig.barberNames.indexOf(identity.fullName)
    if (nameIndex >= 0) return nameIndex
  }

  return 50
}

function sortChairAssignmentsForDisplay(assignments: ChairAssignment[], chair: Chair) {
  return [...assignments].sort((left, right) => {
    const leftOrder = getConfiguredBarberOrder(chair.sortOrder, {
      id: left.barberId,
      fullName: left.barberName,
    })
    const rightOrder = getConfiguredBarberOrder(chair.sortOrder, {
      id: right.barberId,
      fullName: right.barberName,
    })

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    const leftRoleOrder = getAssignmentRoleOrder(left)
    const rightRoleOrder = getAssignmentRoleOrder(right)

    if (leftRoleOrder !== rightRoleOrder) {
      return leftRoleOrder - rightRoleOrder
    }

    return left.barberName.localeCompare(right.barberName, 'th')
  })
}

function sortChairScheduleBarbers(barbers: ChairScheduleBarber[], chair: ChairScheduleConfig) {
  return [...barbers].sort((left, right) => {
    const leftOrder = getConfiguredBarberOrder(chair.sortOrder, {
      id: left.barberId,
      email: left.email,
      fullName: left.fullName,
    })
    const rightOrder = getConfiguredBarberOrder(chair.sortOrder, {
      id: right.barberId,
      email: right.email,
      fullName: right.fullName,
    })

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.fullName.localeCompare(right.fullName, 'th')
  })
}

function sortScheduleBarbersForChair(barbers: ScheduleBarber[], chair: ChairConfig) {
  return [...barbers].sort((left, right) => {
    const leftOrder = getConfiguredBarberOrder(chair.order, {
      id: left.barber.id,
      email: left.barber.email,
      fullName: left.barber.fullName,
    })
    const rightOrder = getConfiguredBarberOrder(chair.order, {
      id: right.barber.id,
      email: right.barber.email,
      fullName: right.barber.fullName,
    })

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.barber.fullName.localeCompare(right.barber.fullName, 'th')
  })
}

function isSharedChair(chair: Chair, primaryAssignments: ChairAssignment[], sharedChairIds: string[]) {
  const defaultConfig = getDefaultChairConfigByOrder(chair.sortOrder)

  return sharedChairIds.includes(chair.id)
    || primaryAssignments.length > 1
    || (defaultConfig?.barberEmails.length ?? 0) > 1
}

function getSharedChairBarberOptions(chair: Chair, barbers: Barber[]) {
  const defaultConfig = getDefaultChairConfigByOrder(chair.sortOrder)
  const configuredBarbers = defaultConfig && defaultConfig.barberEmails.length > 1
    ? barbers.filter((barber) => isChairBarber(barber, defaultConfig))
    : []

  const configuredBarberIds = new Set(configuredBarbers.map((barber) => barber.id))
  const remainingBarbers = barbers.filter((barber) => !configuredBarberIds.has(barber.id))

  return [...configuredBarbers, ...remainingBarbers]
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

function formatCalendarMonth(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
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

  return `${months[month - 1]} ${year + 543}`
}

function getWorkingHourForDate(schedule: BarberSchedule | undefined, dateValue: string) {
  const dayOfWeek = parseLocalDate(dateValue).getDay()

  return schedule?.workingHours.find((workingHour) => workingHour.dayOfWeek === dayOfWeek)
}

function getScheduleChairsForDate(
  barbers: Barber[],
  schedules: Record<string, BarberSchedule>,
  chairConfigs: ChairConfig[],
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
  const assignedStandbyBarberIds = new Set<string>()

  const activeChairs = chairConfigs.flatMap((chair) => {
    const regularBarbers = sortScheduleBarbersForChair(
      scheduleBarbers.filter((scheduleBarber) => isChairBarber(scheduleBarber.barber, chair)),
      chair,
    )
    const standbyBarbers = scheduleBarbers.filter((scheduleBarber) => isStandbyChairBarber(scheduleBarber.barber, chair))
    const workingRegularBarbers = regularBarbers.filter((item) => item.isWorkingToday)
    const availableStandbyBarber = standbyBarbers.find((item) => item.isWorkingToday && !assignedStandbyBarberIds.has(item.barber.id))
    const canUseSubstitute = workingRegularBarbers.length === 0
      && Boolean(availableStandbyBarber)
    const assignedBarbers: ScheduleBarber[] = canUseSubstitute && availableStandbyBarber ? [availableStandbyBarber] : workingRegularBarbers
    const visibleWorkingHours = assignedBarbers
      .map((item) => item.workingHour)
      .filter((workingHour): workingHour is BarberWorkingHour => Boolean(workingHour))

    if (assignedBarbers.length === 0) {
      return []
    }

    if (canUseSubstitute && availableStandbyBarber) {
      assignedStandbyBarberIds.add(availableStandbyBarber.barber.id)
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
    const chairOffDayBarbers = sortScheduleBarbersForChair(
      offDayBarbers.filter((scheduleBarber) => isChairBarber(scheduleBarber.barber, chair)),
      chair,
    )

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

  const primaryChairBarberIds = new Set(chairConfigs.flatMap((chair) => chair.barberIds))
  const standbyBarberIds = new Set(chairConfigs.flatMap((chair) => chair.standbyBarberIds))
  const standbyOffDayStatusChairs = offDayBarbers
    .filter((scheduleBarber) => standbyBarberIds.has(scheduleBarber.barber.id)
      && !primaryChairBarberIds.has(scheduleBarber.barber.id))
    .map((scheduleBarber) => ({
      id: `off-${scheduleBarber.barber.id}`,
      title: scheduleBarber.barber.fullName,
      meta: 'หยุด',
      subtitle: 'ช่างสำรองไม่อยู่ร้านวันนี้',
      order: 199,
      isShared: false,
      hasSubstitute: false,
      isWorkingToday: false,
      workingHours: [],
      barbers: [scheduleBarber],
    }))

  return [...activeChairs, ...offDayStatusChairs, ...standbyOffDayStatusChairs]
}

function getScheduleBoardGridStyle(scheduleChairs: ScheduleChair[]): CSSProperties {
  const columns = scheduleChairs.map((chair) => {
    if (chair.isWorkingToday) {
      return 'minmax(170px, 1fr)'
    }

    return chair.isShared ? '112px' : '84px'
  })

  return {
    gridTemplateColumns: ['44px', ...columns].join(' '),
  }
}

function sortBarbersByChair(barbers: Barber[]) {
  return [...barbers].sort((left, right) => {
    const leftOrder = getBarberChairOrder(left)
    const rightOrder = getBarberChairOrder(right)

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    return left.fullName.localeCompare(right.fullName, 'th')
  })
}

function getBarberChairOrder(barber: Barber) {
  const configuredChair = defaultChairConfigs.find((chair) => isChairBarber(barber, chair))

  if (configuredChair) {
    return configuredChair.order
  }

  if (isBarberMatch(barber, { names: ['ช่างเหน่ง'], emails: ['neng.barber@rodeobarber.local'] })) {
    return 99
  }

  return 50
}

function isChairBarber(barber: Barber, chair: ChairConfig) {
  if (chair.barberIds.includes(barber.id)) {
    return true
  }

  return isBarberMatch(barber, {
    names: chair.barberNames,
    emails: chair.barberEmails,
  })
}

function isStandbyChairBarber(barber: Barber, chair: ChairConfig) {
  if (chair.standbyBarberIds.includes(barber.id)) {
    return true
  }

  return isBarberMatch(barber, {
    names: chair.standbyBarberNames,
    emails: chair.standbyBarberEmails,
  })
}

function normalizeIdentityValue(value: string) {
  return value.trim().toLowerCase()
}

function isBarberMatch(barber: Barber, config: { names: string[]; emails: string[] }) {
  const barberEmail = normalizeIdentityValue(barber.email)

  if (barberEmail && config.emails.some((email) => normalizeIdentityValue(email) === barberEmail)) {
    return true
  }

  return config.names.includes(barber.fullName)
}

function getChairSubtitle(chair: ChairConfig, assignedBarbers: ScheduleBarber[]) {
  const hasStandbyBarber = assignedBarbers.some((item) => isStandbyChairBarber(item.barber, chair))

  if (hasStandbyBarber) {
    return `แทน ${chair.barberNames.join(' / ')}`
  }

  const assignedBarberNames = assignedBarbers.map((item) => item.barber.fullName)

  if (assignedBarberNames.includes('ช่างบั้ม')) {
    return 'ผมยาว'
  }

  return chair.note
}

function getChairDisplayTitle(chair: ChairConfig, assignedBarbers: ScheduleBarber[]) {
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

function getMonthKey(dateValue: string) {
  return dateValue.slice(0, 7)
}

function addMonths(monthKey: string, months: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + months, 1)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getCalendarDays(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month - 1, 1 - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)

    return {
      date,
      dateValue: formatLocalDateInputValue(date),
      isOutsideMonth: date.getMonth() !== month - 1,
    }
  })
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

  if (dateValue > today) {
    return `${dateValue}T10:00`
  }

  const nextAvailableSlot = roundUpToNextSlot(new Date(), 60)
  const nextAvailableDate = formatLocalDateInputValue(nextAvailableSlot)
  const nextAvailableHour = nextAvailableSlot.getHours()
  const lastBookingStartHour = bookingStartHours.at(-1) ?? scheduleTimelineStartHour

  if (nextAvailableDate > today || nextAvailableHour > lastBookingStartHour) {
    return `${addDays(today, 1)}T10:00`
  }

  return formatLocalDateTimeInputValue(nextAvailableSlot)
}

function clampDateTimeToMinimum(dateTimeValue: string) {
  const dateValue = clampDateToToday(dateTimeValue.slice(0, 10))
  const normalizedValue = dateTimeValue.slice(0, 10) < dateValue
    ? getDefaultBookingDateTime(dateValue)
    : normalizeBookingDateTimeToHour(dateTimeValue)
  const minimumValue = getMinimumStaffBookingDateTime(dateValue)

  return normalizedValue < minimumValue ? minimumValue : normalizedValue
}

function createEmptyStaffBookingForm(barberId = '', startAt = getDefaultBookingDateTime(getTodayDate())) {
  return {
    customerId: '',
    guestName: '',
    guestPhoneNumber: '',
    guestEmail: '',
    barberId,
    startAt,
    serviceIds: [] as string[],
    customerNote: '',
  }
}

function buildBookingDateTime(dateValue: string, hourValue: string) {
  const hour = Number.parseInt(hourValue, 10)
  const normalizedHour = bookingStartHours.includes(hour) ? hour : scheduleTimelineStartHour

  return `${clampDateToToday(dateValue)}T${String(normalizedHour).padStart(2, '0')}:00`
}

function getBookingHourValue(dateTimeValue: string) {
  const hour = Number.parseInt(dateTimeValue.slice(11, 13), 10)
  const normalizedHour = bookingStartHours.includes(hour) ? hour : scheduleTimelineStartHour

  return String(normalizedHour).padStart(2, '0')
}

function normalizeBookingDateTimeToHour(dateTimeValue: string) {
  return buildBookingDateTime(dateTimeValue.slice(0, 10), getBookingHourValue(dateTimeValue))
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
