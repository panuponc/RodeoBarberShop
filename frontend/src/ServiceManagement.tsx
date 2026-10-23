import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Clock3, Pencil, Plus, Power, Scissors, Users } from 'lucide-react'
import './ServiceManagement.css'

export type ManagedService = {
  id: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type BarberService = { serviceId: string; name: string; price: number; durationMinutes: number }
type ServiceBarber = { id: string; fullName: string; nickname: string | null; services?: BarberService[] }
type Api = <T>(path: string, options?: RequestInit) => Promise<T>

type Props = {
  api: Api
  onServicesChanged: () => Promise<void>
}

const emptyForm = { name: '', description: '', price: '', durationMinutes: '60' }

function money(value: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(value)
}

function durationLabel(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60} ชม.`
  if (minutes > 60) return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`
  return `${minutes} นาที`
}

export function ServiceManagement({ api, onServicesChanged }: Props) {
  const [tab, setTab] = useState<'catalogue' | 'barbers'>('catalogue')
  const [services, setServices] = useState<ManagedService[]>([])
  const [barbers, setBarbers] = useState<ServiceBarber[]>([])
  const [selectedBarberId, setSelectedBarberId] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [editing, setEditing] = useState<ManagedService | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const activeServices = useMemo(() => services.filter(service => service.isActive), [services])
  const selectedBarber = barbers.find(barber => barber.id === selectedBarberId) ?? null

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [managedServices, barberList] = await Promise.all([
        api<ManagedService[]>('/api/services/manage'),
        api<ServiceBarber[]>('/api/barbers'),
      ])
      setServices(managedServices)
      setBarbers(barberList)
      setSelectedBarberId(current => {
        const nextId = current || barberList[0]?.id || ''
        const nextBarber = barberList.find(barber => barber.id === nextId)
        const mappedIds = nextBarber?.services?.map(service => service.serviceId) ?? []
        setSelectedServiceIds(mappedIds.length > 0 ? mappedIds : managedServices.filter(service => service.isActive).map(service => service.id))
        return nextId
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลบริการไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  // Load once when the management workspace opens.
  /* oxlint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => { void load() }, [])
  /* oxlint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function selectBarber(barberId: string) {
    setSelectedBarberId(barberId)
    const barber = barbers.find(item => item.id === barberId)
    const mappedIds = barber?.services?.map(service => service.serviceId) ?? []
    setSelectedServiceIds(mappedIds.length > 0 ? mappedIds : activeServices.map(service => service.id))
  }

  function openCreate() {
    setEditing('new')
    setForm(emptyForm)
    setError('')
  }

  function openEdit(service: ManagedService) {
    setEditing(service)
    setForm({
      name: service.name,
      description: service.description ?? '',
      price: String(service.price),
      durationMinutes: service.durationMinutes >= 60 && service.durationMinutes <= 720 && service.durationMinutes % 60 === 0 ? String(service.durationMinutes) : '',
    })
    setError('')
  }

  async function saveService(event: FormEvent) {
    event.preventDefault()
    const price = Number(form.price)
    const durationMinutes = Number(form.durationMinutes)
    if (!form.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(durationMinutes) || durationMinutes < 60 || durationMinutes > 720 || durationMinutes % 60 !== 0) {
      setError('กรอกชื่อ ราคา และระยะเวลาให้ครบถ้วน')
      return
    }

    setBusy(true)
    setError('')
    try {
      const isNew = editing === 'new'
      const current = isNew ? null : editing
      await api(isNew ? '/api/services' : `/api/services/${current?.id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price,
          durationMinutes,
          ...(current ? { isActive: current.isActive } : {}),
        }),
      })
      setMessage(isNew ? 'เพิ่มบริการแล้ว' : 'บันทึกบริการแล้ว')
      setEditing(null)
      await Promise.all([load(), onServicesChanged()])
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกบริการไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function setServiceActive(service: ManagedService, isActive: boolean) {
    if (isActive && (service.durationMinutes < 60 || service.durationMinutes > 720 || service.durationMinutes % 60 !== 0)) {
      openEdit(service)
      setError('กรุณาแก้ระยะเวลาเป็น 1–12 ชั่วโมงก่อนเปิดใช้งาน')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api(`/api/services/${service.id}`, {
        method: isActive ? 'PUT' : 'DELETE',
        body: isActive ? JSON.stringify({
          name: service.name,
          description: service.description,
          price: service.price,
          durationMinutes: service.durationMinutes,
          isActive,
        }) : undefined,
      })
      setMessage(isActive ? `เปิด ${service.name} ให้จองแล้ว` : `พัก ${service.name} จากการจองใหม่แล้ว`)
      await Promise.all([load(), onServicesChanged()])
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'เปลี่ยนสถานะบริการไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function saveBarberServices() {
    if (!selectedBarber) return
    if (selectedServiceIds.length === 0) {
      setError('เลือกอย่างน้อย 1 บริการที่ช่างรับทำ')
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await api<ServiceBarber>(`/api/barbers/${selectedBarber.id}/services`, {
        method: 'PUT',
        body: JSON.stringify({ serviceIds: selectedServiceIds }),
      })
      setBarbers(current => current.map(barber => barber.id === updated.id ? updated : barber))
      setMessage(`บันทึกบริการของ ${updated.nickname || updated.fullName} แล้ว`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกบริการของช่างไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="service-management">
      <div className="service-management-toolbar">
        <div className="service-tabs" role="tablist" aria-label="จัดการบริการ">
          <button className={tab === 'catalogue' ? 'active' : ''} onClick={() => setTab('catalogue')} role="tab" type="button"><Scissors size={17} />รายการบริการ</button>
          <button className={tab === 'barbers' ? 'active' : ''} onClick={() => setTab('barbers')} role="tab" type="button"><Users size={17} />บริการของช่าง</button>
        </div>
        {tab === 'catalogue' && <button className="service-add-button" onClick={openCreate} type="button"><Plus size={18} />เพิ่มบริการ</button>}
      </div>

      {message && <div className="service-feedback success" role="status"><Check size={17} />{message}</div>}
      {error && <div className="service-feedback error" role="alert">{error}</div>}

      {loading ? <p className="service-empty">กำลังโหลดบริการ...</p> : tab === 'catalogue' ? (
        <div className="service-catalogue">
          <div className="service-summary">
            <span><strong>{activeServices.length}</strong> เปิดรับจอง</span>
            <span><strong>{services.length - activeServices.length}</strong> พักไว้</span>
          </div>
          {services.length === 0 ? <p className="service-empty">ยังไม่มีบริการ กด “เพิ่มบริการ” เพื่อเริ่มต้น</p> : (
            <div className="sm-service-list">
              {services.map(service => (
                <article className={`service-row${service.isActive ? '' : ' inactive'}`} key={service.id}>
                  <div className="service-row-main">
                    <span className={`service-state-dot ${service.isActive ? 'active' : ''}`} aria-hidden="true" />
                    <div>
                      <div className="service-row-title"><strong>{service.name}</strong><span>{service.isActive ? 'เปิดรับจอง' : 'พักบริการ'}</span></div>
                      {service.description && <p>{service.description}</p>}
                      <div className="service-row-meta"><b>{money(service.price)}</b><span><Clock3 size={14} />{durationLabel(service.durationMinutes)}</span></div>
                    </div>
                  </div>
                  <div className="service-row-actions">
                    <button className="secondary" disabled={busy} onClick={() => openEdit(service)} type="button"><Pencil size={16} />แก้ไข</button>
                    <button className={service.isActive ? 'service-pause' : 'service-resume'} disabled={busy} onClick={() => void setServiceActive(service, !service.isActive)} type="button"><Power size={16} />{service.isActive ? 'พักรับจอง' : 'เปิดใช้งาน'}</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="barber-service-panel">
          <div className="barber-service-intro">
            <div><h2>ช่างแต่ละคนรับบริการอะไร</h2><p>ลูกค้าจะเลือกช่างได้เฉพาะบริการที่กำหนดไว้</p></div>
            <label>เลือกช่าง<select value={selectedBarberId} onChange={event => selectBarber(event.target.value)}>{barbers.map(barber => <option key={barber.id} value={barber.id}>{barber.nickname || barber.fullName}</option>)}</select></label>
          </div>
          {selectedBarber && <div className="barber-service-editor">
            <div className="barber-service-heading"><span className="service-barber-avatar">{(selectedBarber.nickname || selectedBarber.fullName).trim().charAt(0)}</span><div><strong>{selectedBarber.fullName}</strong><small>{selectedServiceIds.length} จาก {activeServices.length} บริการ</small></div></div>
            <div className="barber-service-checklist">
              {activeServices.map(service => <label key={service.id}><input type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={event => setSelectedServiceIds(current => event.target.checked ? [...current, service.id] : current.filter(id => id !== service.id))} /><span><strong>{service.name}</strong><small>{money(service.price)} · {durationLabel(service.durationMinutes)}</small></span></label>)}
            </div>
            <button className="barber-service-save" disabled={busy || activeServices.length === 0} onClick={() => void saveBarberServices()} type="button">{busy ? 'กำลังบันทึก...' : 'บันทึกบริการของช่าง'}</button>
          </div>}
        </div>
      )}

      {editing && <div className="service-editor-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setEditing(null) }}>
        <form className="service-editor" onSubmit={saveService}>
          <div className="service-editor-head"><div><span>Service catalogue</span><h2>{editing === 'new' ? 'เพิ่มบริการ' : 'แก้ไขบริการ'}</h2></div><button aria-label="ปิด" onClick={() => setEditing(null)} type="button">×</button></div>
          <label>ชื่อบริการ<input autoFocus maxLength={150} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
          <label>รายละเอียด<textarea rows={3} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label>
          <div className="service-editor-grid">
            <label>ราคา (บาท)<input min="0" step="1" inputMode="decimal" type="number" value={form.price} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} /></label>
            <label>เวลาที่ใช้ (ชั่วโมง)<select required value={form.durationMinutes} onChange={event => setForm(current => ({ ...current, durationMinutes: event.target.value }))}>
              <option value="" disabled>เลือกระยะเวลาใหม่</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(hours => <option key={hours} value={hours * 60}>{hours} ชั่วโมง</option>)}
            </select></label>
          </div>
          <p className="service-editor-note">เวลานี้ใช้กันช่องคิวจริง ลูกค้าจะเห็นทั้งราคาและระยะเวลาก่อนจอง</p>
          <div className="service-editor-actions"><button className="secondary" onClick={() => setEditing(null)} type="button">ยกเลิก</button><button disabled={busy} type="submit">{busy ? 'กำลังบันทึก...' : 'บันทึกบริการ'}</button></div>
        </form>
      </div>}
    </section>
  )
}
