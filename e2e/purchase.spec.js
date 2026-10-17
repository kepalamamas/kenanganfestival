import { test, expect } from '@playwright/test'
import CryptoJS from 'crypto-js'

const category = {
  id: 2,
  name: 'Presale 2',
  price: 250000,
  is_active: true,
  is_started: true,
  is_available: true,
  is_ticket_limitation: true,
  min_ticket: 1,
  max_ticket: 3,
}
const event = {
  id: 1,
  name: 'Kenangan Festival 2026',
  checkout_time: 10,
  is_no_ticket_holder: false,
  fee: 5000,
  ppn: 11,
  transaction_fee: 2000,
  categories: [
    category,
    { ...category, id: 3, name: 'Early Bird', is_available: false },
  ],
}

async function mockApi(page) {
  await page.addInitScript(() => {
    window.turnstile = {
      render(container, options) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = 'Complete verification'
        button.addEventListener('click', () =>
          options.callback('test-challenge'),
        )
        container.append(button)
        return 0
      },
      reset() {},
      remove() {},
    }
  })
  await page.route('https://open.spotify.com/**', (route) =>
    route.fulfill({
      body: '<html><body>Playlist</body></html>',
      contentType: 'text/html',
    }),
  )
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    expect(url.pathname).not.toContain('/public-checkout/')
    expect(route.request().headers()).not.toHaveProperty('authorization')
    let body
    if (url.pathname.includes('/link-url/')) body = { data: { isOpen: true } }
    else if (url.pathname.endsWith('/form-config'))
      body = {
        data: {
          fields: {
            name: {
              enabled: true,
              required: true,
              label: 'Attendee name',
              type: 'text',
            },
          },
        },
      }
    else if (url.pathname.endsWith('/categories/checkout')) {
      const payload = JSON.parse(
        CryptoJS.AES.decrypt(
          route.request().postDataJSON().data,
          'test-only-payload-key',
        ).toString(CryptoJS.enc.Utf8),
      )
      expect(payload.detail).toEqual([
        { category_id: 2, category_name: 'Presale 2', quantity: 2 },
      ])
      expect(payload.passengers).toHaveLength(2)
      expect(payload.turnstile_token).toBe('test-challenge')
      body = {
        success: true,
        order_id: 'test-order',
        payment_url: 'https://checkout.xendit.co/test-festival',
      }
    } else if (url.pathname.endsWith('/public-check/validate'))
      body = {
        data: {
          location: 'Tennis Indoor, Gelora Bung Karno',
          tnc_content:
            'Each ticket admits **one person**. Keep your ticket private.',
          tickets: ['FIRST-REAL-CODE', 'SECOND-REAL-CODE'].map(
            (code, index) => ({
              code,
              name: `Guest ${index + 1}`,
              buyer_name: 'Festival Buyer',
              kategori: 'Presale 2',
              event_name: event.name,
            }),
          ),
        },
      }
    else body = { data: event }
    await route.fulfill({ json: body })
  })
}

async function noOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflow).toBe(false)
}

test('public checkout, normal payment return and emailed printable tickets', async ({
  page,
}, testInfo) => {
  await mockApi(page)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByAltText('Kenangan Festival header artwork'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Buy ticket' })).toBeEnabled()
  const hero = await page.locator('#intro').boundingBox()
  expect(hero.y).toBe(0)
  expect(hero.height).toBe(page.viewportSize().height)
  expect(hero.width).toBe(page.viewportSize().width)
  await expect(page.getByRole('button', { name: /artwork/ })).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('landing.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Buy ticket' }).click()
  await expect(page).toHaveURL(/\/checkout\?category_id=2/)
  await expect(page.getByRole('timer')).toHaveText('10:00')
  await page.getByRole('button', { name: 'Increase quantity' }).click()
  await page.getByLabel('Buyer name').fill('Festival Buyer')
  await page.getByLabel('Email', { exact: true }).fill('buyer@example.com')
  await page.getByLabel('Phone', { exact: true }).fill('08123456789')
  await page.getByRole('button', { name: 'Use buyer details' }).click()
  await page.getByLabel('Attendee name').nth(1).fill('Second Guest')
  await page.getByLabel(/I confirm/).check()
  await page.getByLabel(/I agree/).check()
  await page.getByRole('button', { name: 'Complete verification' }).click()
  await noOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('checkout.png'),
    fullPage: true,
  })
  await page.route('https://checkout.xendit.co/test-festival', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<a href="http://127.0.0.1:4175/payment-success?order_id=test-order">Return to festival</a>',
    }),
  )
  await page.getByRole('button', { name: 'Pay now' }).click()
  await page.getByRole('link', { name: 'Return to festival' }).click()
  await expect(
    page.getByRole('heading', { name: 'Payment processing' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'View tickets' })).toHaveCount(0)
  await page.screenshot({
    path: testInfo.outputPath('payment-success.png'),
    fullPage: true,
  })
  await page.goto('/order-detail?token=test-ticket')
  await expect(page.getByAltText('QR code for ticket 1')).toBeVisible()
  await expect(page.getByAltText('QR code for ticket 2')).toBeVisible()
  expect(
    await page
      .getByAltText('QR code for ticket 1')
      .evaluate((image) => image.complete && image.naturalWidth > 0),
  ).toBe(true)
  await noOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('tickets.png'),
    fullPage: true,
  })
  await page.reload()
  await expect(page.getByText('FIRST-REAL-CODE')).toBeVisible()
  expect(errors).toEqual([])
})

test('failed payment and missing references never show ticket access', async ({
  page,
}, testInfo) => {
  await mockApi(page)
  await page.goto('/payment-failed?order_id=test-order')
  await expect(
    page.getByRole('heading', { name: 'Payment not completed' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'View tickets' })).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({
    path: testInfo.outputPath('payment-failed.png'),
    fullPage: true,
  })
  await page.goto('/payment-success')
  await expect(page.getByRole('alert')).toContainText('reference is missing')
  await page.goto('/order-detail')
  await expect(page.getByRole('alert')).toContainText('reference is missing')
})
