import { describe, expect, it } from 'vitest'
import {
  categoryStatus,
  quantityBounds,
  estimateTotal,
  paymentUrl,
  unwrapVoucher,
} from './purchase'

const available = { is_active: true, is_started: true, is_available: true }

describe('ticket sale rules', () => {
  it('distinguishes closed, seated, upcoming, ended, booked, sold-out and available tickets', () => {
    expect(categoryStatus(available, false)).toBe('Sale closed')
    expect(categoryStatus({ ...available, section_id: 'seat' }, true)).toBe(
      'Seat selection required',
    )
    expect(categoryStatus({ ...available, is_started: false }, true)).toBe(
      'Coming soon',
    )
    expect(categoryStatus({ ...available, is_ended: true }, true)).toBe(
      'Sale ended',
    )
    expect(
      categoryStatus(
        { ...available, is_full_booked: true, is_available: false },
        true,
      ),
    ).toBe('Fully booked')
    expect(categoryStatus({ ...available, is_available: false }, true)).toBe(
      'Sold out',
    )
    expect(categoryStatus(available, true)).toBe('Buy ticket')
  })
  it('combines category, event, and disclosed stock limits', () => {
    expect(
      quantityBounds(
        { max_purchase: 6 },
        { is_ticket_limitation: true, min_ticket: 2, max_ticket: 4 },
      ),
    ).toEqual({ min: 2, max: 4 })
    expect(
      quantityBounds({}, { show_last_tickets: true, remaining_available: 1 }),
    ).toEqual({ min: 1, max: 1 })
    expect(quantityBounds({}, {})).toEqual({ min: 1, max: 100 })
  })
  it('matches backend fee semantics, including included tax', () => {
    expect(
      estimateTotal(
        { fee: 10, is_persen: true, ppn: 11, transaction_fee: 2000 },
        100000,
        2,
      ),
    ).toEqual({
      subtotal: 200000,
      fee: 20000,
      tax: 22000,
      transaction: 2000,
      total: 244000,
    })
    expect(estimateTotal({ include_tax: true }, 1000, 1).total).toBe(1000)
  })
  it('accepts HTTPS Xendit URLs and rejects unsafe/foreign redirects', () => {
    expect(paymentUrl('https://checkout.xendit.co/invoice/123')).toContain(
      'xendit.co',
    )
    for (const url of [
      'javascript:alert(1)',
      'http://checkout.xendit.co/a',
      'https://xendit.co.evil.test/a',
      'invalid',
    ])
      expect(() => paymentUrl(url)).toThrow()
  })
  it('unwraps ticket responses without fabricating ticket codes', () => {
    const voucher = { tickets: [{ code: 'valid' }] }
    expect(unwrapVoucher({ data: { result: voucher } })).toEqual(voucher)
    expect(() => unwrapVoucher({ data: { tickets: [] } })).toThrow()
  })
})
