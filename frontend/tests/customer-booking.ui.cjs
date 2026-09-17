// All API traffic is mocked; this test never books or cancels real appointments.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.UI_TEST_URL || 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-09-20T02:00:00Z') });
    const services = [
      { id: 'cut', name: 'ตัดผมชาย', description: 'ออกแบบทรงและจัดแต่ง', price: 350, durationMinutes: 60 },
      { id: 'wash', name: 'สระผมและจัดแต่ง', description: null, price: 150, durationMinutes: 30 },
      { id: 'color', name: 'ทำสีผม', description: 'ปรึกษาสีที่เหมาะกับคุณ', price: 1200, durationMinutes: 120 },
    ];
    const barbers = [{ id: 'a', fullName: 'ช่างบั๊ม', nickname: 'บ', specialty: 'ตัดผมชาย' }, { id: 'b', fullName: 'ช่างเค้ก', nickname: 'ค', specialty: 'ออกแบบทรงผม' }];
    const slot = (date, hour, available = true) => ({ startAt: `${date}T${hour}:00:00+07:00`, endAt: `${date}T${String(Number(hour) + 1).padStart(2, '0')}:00:00+07:00`, isAvailable: available });
    let bookings = [], writes = 0, cancels = 0, failLoad = true, availabilityError = false;
    await page.route('**/api/**', async route => {
      const request = route.request(), u = new URL(request.url());
      const reply = (json, status = 200) => route.fulfill({ status, json });
      if (u.pathname === '/api/auth/login') return reply({ role: 'Customer', fullName: 'คุณธนวัฒน์', accessToken: 'mock-token' });
      if (u.pathname === '/api/services') {
        if (failLoad) return reply({ message: 'ทดสอบโหลดไม่สำเร็จ' }, 503);
        return reply(services);
      }
      if (u.pathname === '/api/barbers') return reply(barbers);
      if (u.pathname === '/api/bookings/my') return reply(bookings);
      if (u.pathname.endsWith('/availability')) {
        if (availabilityError) return reply({ message: 'ทดสอบเวลาว่างไม่สำเร็จ' }, 503);
        const date = u.searchParams.get('date');
        if (date.endsWith('-22')) return reply([]);
        // Delayed previous selection must never replace the new barber's slots.
        if (u.searchParams.get('barberId') === 'a') {
          await new Promise(resolve => setTimeout(resolve, 350));
          return reply([slot(date, '08'), slot(date, '10'), slot(date, '11', false), slot(date, '12')]);
        }
        return reply([slot(date, '14'), slot(date, '15')]);
      }
      if (u.pathname === '/api/bookings' && request.method() === 'POST') {
        writes++;
        const body = request.postDataJSON();
        assert.equal(body.barberId, 'b'); assert.deepEqual(body.serviceIds, ['cut']);
        assert.equal(body.startAt, '2026-09-20T14:00:00+07:00');
        if (writes === 1) return reply({ message: 'เวลานี้มีผู้จองแล้ว กรุณาเลือกเวลาใหม่' }, 409);
        const created = { id: 'test', bookingNumber: 'RB-TEST', barberId: 'b', barberName: 'ช่างเค้ก', startAt: body.startAt, endAt: '2026-09-20T15:00:00+07:00', bookingStatus: 'PendingConfirmation', totalAmount: 350, services: [{ serviceId: 'cut', serviceName: 'ตัดผมชาย', durationMinutes: 60, quantity: 1 }] };
        bookings = [created]; return reply(created);
      }
      if (u.pathname.endsWith('/cancel')) {
        cancels++;
        assert.equal(request.postDataJSON().reason, 'Changed plans');
        bookings = [{ ...bookings[0], bookingStatus: 'Cancelled', cancelReason: 'Changed plans' }];
        return reply(bookings[0]);
      }
      if (u.pathname.endsWith('/receipt')) return reply({ paymentNumber: 'RECEIPT-1', shopName: 'Rodeo', customerName: 'Test', barberName: 'Test', paidAt: '2026-09-20T08:00:00Z', totalAmount: 350, services: [] });
      throw Error(`Unexpected API ${request.method()} ${u.pathname}`);
    });
    await page.goto(url);
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('mock@example.com');
    await page.locator('input[type=password]').fill('mock-password');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByRole('alert').waitFor();
    failLoad = false;
    await page.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click();
    const next = page.locator('.cb-action-bar .cb-primary');
    await next.waitFor(); assert(await next.isDisabled());
    await page.getByRole('checkbox').first().check();
    await page.locator('.cb-service.selected').waitFor();
    await page.waitForTimeout(150);
    await page.screenshot({ path: '.tmp/customer-services-mobile.png', fullPage: true });
    for (const width of [320, 390, 759, 760, 820, 1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`);
      const bounds = await next.boundingBox(); assert(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 900);
    }
    await next.click(); assert(await next.isDisabled());
    await page.getByRole('radio', { name: /ช่างบั๊ม/ }).check();
    await page.getByRole('radio', { name: '10:00', exact: true }).waitFor();
    assert.equal(await page.getByRole('radio', { name: '08:00', exact: true }).count(), 0);
    assert.equal(await page.getByRole('radio', { name: '11:00', exact: true }).count(), 0);
    await page.getByRole('radio', { name: '10:00', exact: true }).check(); assert.equal(writes, 0);
    await page.locator('.cb-steps button').first().click();
    await page.getByRole('checkbox').nth(1).check();
    await next.click(); assert(await next.isDisabled());
    await page.locator('.cb-steps button').first().click();
    await page.getByRole('checkbox').nth(1).uncheck();
    await next.click(); assert(await next.isDisabled());
    await page.getByRole('radio', { name: /ช่างเค้ก/ }).check();
    assert(await next.isDisabled());
    await page.getByRole('radio', { name: '14:00', exact: true }).waitFor();
    await page.waitForTimeout(400);
    assert.equal(await page.getByRole('radio', { name: '10:00', exact: true }).count(), 0);
    await page.getByLabel('วันนัดหมาย', { exact: true }).fill('2026-09-22');
    await page.getByText('ไม่มีเวลาว่างสำหรับบริการที่เลือก', { exact: true }).waitFor();
    await page.getByLabel('วันนัดหมาย', { exact: true }).fill('2026-09-20');
    await page.getByRole('radio', { name: '14:00', exact: true }).check();
    await page.screenshot({ path: '.tmp/customer-time-mobile.png', fullPage: true });
    await next.click();
    await page.getByRole('heading', { name: 'ตรวจสอบก่อนยืนยัน' }).waitFor();
    assert.equal(writes, 0);
    await next.click(); await page.getByRole('alert').waitFor(); assert.equal(writes, 1); assert(await next.isDisabled());
    await page.getByRole('radio', { name: '14:00', exact: true }).check();
    await next.click();
    for (const width of [320, 390, 759, 760, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `review overflow ${width}`);
    }
    await page.screenshot({ path: '.tmp/customer-review-desktop.png', fullPage: true });
    await next.click(); await page.getByRole('heading', { name: 'จองคิวเรียบร้อย' }).waitFor(); assert.equal(writes, 2);
    await page.getByRole('button', { name: 'ดูนัดหมายของฉัน', exact: true }).click();
    await page.getByText('RB-TEST', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '.tmp/customer-history-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'ยกเลิกการจอง', exact: true }).click();
    assert(await page.getByRole('button', { name: 'ยืนยันยกเลิก', exact: true }).isDisabled());
    await page.getByRole('textbox', { name: 'เหตุผลการยกเลิก' }).fill('Changed plans');
    await page.getByRole('button', { name: 'ยืนยันยกเลิก', exact: true }).click();
    await page.getByText('เหตุผล: Changed plans', { exact: true }).waitFor(); assert.equal(cancels, 1);
    bookings = [{ ...bookings[0], bookingStatus: 'Completed' }];
    await page.getByRole('button', { name: 'รีเฟรชนัดหมาย', exact: true }).click();
    await page.getByRole('button', { name: 'ดูใบเสร็จ', exact: true }).click();
    await page.getByText('RECEIPT-1', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'ซ่อนใบเสร็จ', exact: true }).click();
    assert.equal(await page.getByText('RECEIPT-1', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'จองคิว', exact: true }).click();
    await page.getByRole('checkbox').first().check(); await next.click();
    availabilityError = true;
    await page.getByLabel('วันนัดหมาย', { exact: true }).fill('2026-09-21');
    await page.getByRole('alert').waitFor(); availabilityError = false;
    await page.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click();
    await page.getByRole('radio', { name: '14:00', exact: true }).check();
    await page.clock.setFixedTime(new Date('2026-09-21T07:00:01Z'));
    await page.waitForTimeout(1200); assert(await next.isDisabled());
    await page.locator('.cb-steps button').first().click();
    services.push(...Array.from({ length: 7 }, (_, i) => ({ id: `extra-${i}`, name: `บริการเพิ่มเติม ${i}`, price: 100, durationMinutes: 30 })));
    // A new session exercises a larger real-world catalogue and long names.
    await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click();
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('mock@example.com');
    await page.locator('input[type=password]').fill('mock-password');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByRole('searchbox', { name: 'ค้นหาบริการ' }).fill('เพิ่มเติม 6');
    assert.equal(await page.getByRole('checkbox').count(), 1);
    await page.getByRole('searchbox', { name: 'ค้นหาบริการ' }).fill('ไม่ตรงกับบริการใด');
    await page.getByText('ไม่พบบริการที่ค้นหา', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: load/retry, service selection, unavailable/past slots, context invalidation, explicit review, conflict recovery, booking success, history/cancellation/receipt, slot expiry, responsive transitions. API mocked; no live writes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
