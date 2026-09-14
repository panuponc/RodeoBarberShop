type Window = { barberId: string; bookableFrom?: string | null; bookableUntil?: string | null; shopOpenAt?: string | null; shopCloseAt?: string | null }
type Leave = { barberId: string; startAt: string; endAt: string }

export function hasRemainingBookingWindow(window: Window, leaves: Leave[], now: number) {
  if (!window.bookableFrom || !window.bookableUntil) return false
  let cursor = Math.max(Date.parse(window.bookableFrom), now)
  const end = Date.parse(window.bookableUntil)
  if (!Number.isFinite(cursor) || !Number.isFinite(end) || cursor >= end) return false
  const blocked = leaves.filter(l => l.barberId === window.barberId
    && Date.parse(l.startAt) < end && Date.parse(l.endAt) > cursor)
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  for (const period of blocked) {
    if (Date.parse(period.startAt) > cursor) return true
    cursor = Math.max(cursor, Date.parse(period.endAt))
    if (cursor >= end) return false
  }
  return cursor < end
}

export function scheduleAvailability(windows: Window[], leaves: Leave[], date: string, now: number) {
  const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10)
  const ranges = windows.filter(w => w.bookableFrom && w.bookableUntil).map(w => ({ id: w.barberId, start: Date.parse(w.bookableFrom!), end: Date.parse(w.bookableUntil!) }))
  const shop = windows.find(w => w.shopOpenAt && w.shopCloseAt)
  if (!shop || Date.parse(shop.shopCloseAt!) <= Date.parse(shop.shopOpenAt!)
    || (date === today && (now < Date.parse(shop.shopOpenAt!) || now >= Date.parse(shop.shopCloseAt!))))
    return { color: 'black', label: 'ร้านปิด' }
  const current = date === today ? ranges.filter(w => w.start <= now && now < w.end) : ranges
  if (!current.length) return { color: 'red', label: 'ช่างหยุดหรือไม่เปิดรับจอง' }
  const overlaps = (w: typeof ranges[number]) => leaves.filter(l => l.barberId === w.id && Date.parse(l.startAt) < w.end && Date.parse(l.endAt) > w.start)
  const hasGap = (w: typeof ranges[number]) => {
    let cursor = w.start
    for (const l of overlaps(w).sort((a,b) => Date.parse(a.startAt)-Date.parse(b.startAt))) {
      if (Date.parse(l.startAt) > cursor) return true
      cursor = Math.max(cursor, Date.parse(l.endAt))
    }
    return cursor < w.end
  }
  const blocked = date === today ? current.every(w => overlaps(w).some(l => Date.parse(l.startAt) <= now && now < Date.parse(l.endAt))) : current.every(w => !hasGap(w))
  if (blocked) return { color: 'red', label: date === today ? 'ไม่พร้อมรับงานช่วงนี้' : 'ไม่พร้อมรับงานทั้งช่วง' }
  return { color: 'green', label: 'เปิดรับจองตามตาราง' }
}
