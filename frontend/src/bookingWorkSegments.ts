import type { Booking } from './App'

export function bookingWorkSegments(booking: Booking) {
  const main = booking.services.filter(service => !service.addedDuringService)
  const additions = new Map<string, Booking['services']>()
  for (const service of booking.services.filter(service => service.addedDuringService)) {
    const key = service.createdAt ?? ''
    additions.set(key, [...(additions.get(key) ?? []), service])
  }
  const groups = [
    ...(main.length ? [{ added: false, services: main }] : []),
    ...[...additions.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, services]) => ({ added: true, services })),
  ]
  const duration = booking.services.reduce((sum, service) => sum + service.durationMinutes * service.quantity, 0)
  const start = new Date(booking.startAt).getTime()
  const matchesBooking = Number.isFinite(start) && duration > 0 && Math.abs(new Date(booking.endAt).getTime() - start - duration * 60000) < 1000
  let cursor = start
  return groups.map(group => {
    const minutes = group.services.reduce((sum, service) => sum + service.durationMinutes * service.quantity, 0)
    const from = cursor
    cursor += minutes * 60000
    return { ...group, minutes, start: matchesBooking ? from : null, end: matchesBooking ? cursor : null }
  })
}
