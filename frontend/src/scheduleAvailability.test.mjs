import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasRemainingBookingWindow } from './scheduleAvailability.ts'

const at = hour => `2026-09-15T${String(hour).padStart(2, '0')}:00:00+07:00`
const window = { barberId: 'bum', bookableFrom: at(10), bookableUntil: at(21) }
const block = (start, end, barberId = 'bum') => ({ barberId, startAt: at(start), endAt: at(end) })

test('advance booking is allowed before opening', () => {
  assert.equal(hasRemainingBookingWindow(window, [], Date.parse(at(1))), true)
})
test('all-day closure disables booking before and during work', () => {
  for (const hour of [1, 10, 15]) {
    assert.equal(hasRemainingBookingWindow(window, [block(10, 21)], Date.parse(at(hour))), false)
  }
})
test('partial leave keeps later working time bookable', () => {
  assert.equal(hasRemainingBookingWindow(window, [block(10, 14)], Date.parse(at(11))), true)
})
test('closure covering remaining work disables booking', () => {
  assert.equal(hasRemainingBookingWindow(window, [block(14, 21)], Date.parse(at(15))), false)
})
test('combined leave and closure can cover the whole shift', () => {
  assert.equal(hasRemainingBookingWindow(window, [block(14, 21), block(10, 14)], Date.parse(at(1))), false)
})
test('one closed barber does not block another on a shared chair', () => {
  assert.equal(hasRemainingBookingWindow({ ...window, barberId: 'other' }, [block(10, 21)], Date.parse(at(1))), true)
})
test('ended and missing work windows cannot be booked', () => {
  assert.equal(hasRemainingBookingWindow(window, [], Date.parse(at(21))), false)
  assert.equal(hasRemainingBookingWindow({ barberId: 'bum' }, [], Date.parse(at(1))), false)
})
test('future day stays bookable and reopening restores booking', () => {
  const yesterday = Date.parse('2026-09-14T23:00:00+07:00')
  assert.equal(hasRemainingBookingWindow(window, [], yesterday), true)
  assert.equal(hasRemainingBookingWindow(window, [block(10, 21)], yesterday), false)
  assert.equal(hasRemainingBookingWindow(window, [], Date.parse(at(12))), true)
})
