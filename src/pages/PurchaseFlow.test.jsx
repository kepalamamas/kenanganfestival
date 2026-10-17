import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventContext } from '../EventContext'
import CheckoutPage from './CheckoutPage'
import PaymentResultPage from './PaymentResultPage'
import OrderDetailPage from './OrderDetailPage'
import { api } from '../api'

vi.mock('../api', () => ({
  api: { checkout: vi.fn(), voucher: vi.fn() },
}))
vi.mock('../components/Turnstile', () => ({
  default: ({ onVerify }) => (
    <button type="button" onClick={() => onVerify('verified')}>
      Verify challenge
    </button>
  ),
}))
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr') },
}))

const event = {
  id: 'event-1',
  name: 'Kenangan Festival',
  is_no_ticket_holder: true,
  checkout_time: 600,
  categories: [
    {
      id: 'category-1',
      name: 'Presale',
      price: 250000,
      is_active: true,
      is_started: true,
      is_available: true,
      is_ticket_limitation: true,
      min_ticket: 1,
      max_ticket: 3,
    },
  ],
}
const state = {
  event,
  form: { fields: {} },
  open: true,
  loading: false,
  error: '',
  reload: vi.fn(),
}

function show(component, url = '/checkout', value = state) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <EventContext.Provider value={value}>{component}</EventContext.Provider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  sessionStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('public checkout', () => {
  it('updates category, quantity, configured inputs, voucher and attendee details', () => {
    show(<CheckoutPage />, '/checkout', {
      ...state,
      event: {
        ...event,
        is_no_ticket_holder: false,
        categories: [
          ...event.categories,
          {
            ...event.categories[0],
            id: 'second',
            name: 'Normal Sale',
            min_ticket: 2,
            is_voucher_mandatory: true,
          },
        ],
      },
      form: {
        fields: {
          buyer_identity_number: {
            enabled: true,
            required: true,
            label: 'Buyer ID',
          },
          name: { enabled: true, required: true, label: 'Attendee name' },
          gender: {
            enabled: true,
            label: 'Gender',
            type: 'select',
            options: ['Other'],
          },
          address: { enabled: true, label: 'Address', type: 'textarea' },
        },
      },
    })
    fireEvent.change(screen.getByLabelText('Ticket category'), {
      target: { value: 'second' },
    })
    expect(screen.getByLabelText('Ticket quantity')).toHaveValue(2)
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }))
    expect(screen.getByLabelText('Ticket quantity')).toHaveValue(2)
    fireEvent.change(screen.getByLabelText('Buyer name'), {
      target: { value: 'Buyer' },
    })
    fireEvent.change(screen.getByLabelText('Buyer ID'), {
      target: { value: 'ID-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use buyer details' }))
    expect(screen.getAllByLabelText('Attendee name')[0]).toHaveValue('Buyer')
    fireEvent.change(screen.getAllByLabelText('Attendee name')[1], {
      target: { value: 'Second' },
    })
    fireEvent.change(screen.getAllByLabelText('Gender')[0], {
      target: { value: 'Other' },
    })
    fireEvent.change(screen.getAllByLabelText('Address')[0], {
      target: { value: 'Jakarta' },
    })
    expect(screen.getAllByLabelText('Address')[0]).toHaveValue('Jakarta')
    fireEvent.change(screen.getByLabelText('Voucher code (required)'), {
      target: { value: 'PROMO' },
    })
    expect(screen.getByLabelText('Voucher code (required)')).toHaveValue(
      'PROMO',
    )
  })
  it('redirects with the existing checkout response and prevents duplicate submission', async () => {
    api.checkout.mockResolvedValue({
      order_id: 'created-order',
      payment_url: 'https://checkout.xendit.co/pay',
    })
    const redirect = vi.fn()
    show(<CheckoutPage onPayment={redirect} />)
    for (const [label, value] of [
      ['Buyer name', 'Buyer'],
      ['Email', 'buyer@example.com'],
      ['Phone', '08123456789'],
    ])
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.click(screen.getByLabelText(/I confirm/))
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Verify challenge' }))
    const submit = screen.getByRole('button', { name: 'Pay now' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    await waitFor(() => expect(redirect).toHaveBeenCalled())
    expect(sessionStorage.length).toBe(0)
    expect(api.checkout).toHaveBeenCalledOnce()
    expect(redirect).toHaveBeenCalledWith('https://checkout.xendit.co/pay')
  })
  it('reports loading errors, retries and unavailable categories', () => {
    const retry = vi.fn()
    const view = show(<CheckoutPage />, '/checkout', {
      ...state,
      error: 'Cannot load',
      reload: retry,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
    view.unmount()
    show(<CheckoutPage />, '/checkout', {
      ...state,
      event: { ...event, categories: [] },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('No tickets')
  })
  it('uses minute-based checkout time and numeric category IDs from the backend', () => {
    show(<CheckoutPage />, '/checkout?category_id=2', {
      ...state,
      event: {
        ...event,
        checkout_time: 10,
        categories: [
          { ...event.categories[0], id: 1, name: 'First' },
          { ...event.categories[0], id: 2, name: 'Selected' },
        ],
      },
    })
    expect(screen.getByRole('timer')).toHaveTextContent('10:00')
    expect(screen.getByLabelText('Ticket category')).toHaveValue('2')
  })
  it('renders category, price and quantity bounds', () => {
    show(<CheckoutPage />)
    expect(
      screen.getByRole('heading', { name: 'Checkout' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Ticket quantity')).toHaveValue(1)
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(screen.getByLabelText('Ticket quantity')).toHaveValue(2)
    expect(screen.getByRole('button', { name: 'Pay now' })).toBeDisabled()
  })
  it('submits buyer and selected category and preserves checkout errors', async () => {
    api.checkout.mockRejectedValue(new Error('Please try again'))
    show(<CheckoutPage />)
    fireEvent.change(screen.getByLabelText('Buyer name'), {
      target: { value: 'Festival Guest' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'guest@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '08123456789' },
    })
    fireEvent.click(screen.getByLabelText(/I confirm/))
    fireEvent.click(screen.getByLabelText(/I agree/))
    fireEvent.click(screen.getByRole('button', { name: 'Verify challenge' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pay now' }))
    await waitFor(() => expect(api.checkout).toHaveBeenCalledOnce())
    expect(api.checkout.mock.calls[0][0]).toMatchObject({
      event_id: 'event-1',
      detail: [{ category_id: 'category-1', quantity: 1 }],
      orderInfo: { name: 'Festival Guest' },
      turnstile_token: 'verified',
      is_aggree: true,
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please try again',
    )
  })
  it('shows attendee fields only when event requires ticket holders', () => {
    show(<CheckoutPage />, '/checkout', {
      ...state,
      event: { ...event, is_no_ticket_holder: false },
      form: {
        fields: {
          name: {
            enabled: true,
            required: true,
            label: 'Attendee name',
            type: 'text',
          },
        },
      },
    })
    expect(screen.getByLabelText('Attendee name')).toBeRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    expect(screen.getAllByLabelText('Attendee name')).toHaveLength(2)
  })
  it('leaves event account policies to the existing public checkout API', () => {
    show(<CheckoutPage />, '/checkout', {
      ...state,
      event: { ...event, max_tickets_per_account: 1 },
    })
    expect(screen.getByRole('button', { name: 'Pay now' })).toBeInTheDocument()
    expect(screen.queryByText(/requires an account/)).not.toBeInTheDocument()
  })
  it('handles unavailable and loading checkout', () => {
    const view = show(<CheckoutPage />, '/checkout', {
      ...state,
      loading: true,
    })
    expect(screen.getByRole('status')).toHaveTextContent(/Loading/)
    view.unmount()
    show(<CheckoutPage />, '/checkout', { ...state, open: false, event: null })
    expect(screen.getByRole('alert')).toHaveTextContent(/closed/)
  })
})

describe('payment returns', () => {
  it('accepts the existing order-id return without requiring custom credentials', () => {
    show(<PaymentResultPage />, '/payment-success?order_id=order-1')
    expect(
      screen.getByRole('heading', { name: 'Payment processing' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/confirmation email/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(api.voucher).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('link', { name: 'View tickets' }),
    ).not.toBeInTheDocument()
  })
  it('shows an unsuccessful return without requesting a status endpoint', () => {
    show(<PaymentResultPage failed />, '/payment-failed?order_id=order-1')
    expect(
      screen.getByRole('heading', { name: 'Payment not completed' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to tickets' }),
    ).toBeInTheDocument()
    expect(api.voucher).not.toHaveBeenCalled()
  })
  it('handles missing order references', () => {
    show(<PaymentResultPage />, '/payment-success')
    expect(screen.getByRole('alert')).toHaveTextContent(/reference is missing/)
  })
  it('confirms payment only through the existing public ticket-validation API', async () => {
    api.voucher.mockResolvedValue({
      data: { tickets: [{ code: 'PAID-TICKET' }] },
    })
    show(
      <PaymentResultPage />,
      '/payment-success?order_id=order-1&token=valid-ticket',
    )
    expect(
      await screen.findByRole('heading', { name: 'Payment confirmed' }),
    ).toBeInTheDocument()
    expect(api.voucher).toHaveBeenCalledWith(
      'valid-ticket',
      expect.any(AbortSignal),
    )
    expect(screen.getByRole('link', { name: 'View tickets' })).toHaveAttribute(
      'href',
      '/order-detail?token=valid-ticket',
    )
  })
  it('does not display tickets for an invalid token', async () => {
    api.voucher.mockRejectedValue(new Error('Invalid ticket reference'))
    show(
      <PaymentResultPage />,
      '/payment-success?order_id=order-1&token=invalid',
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid ticket reference',
    )
    expect(
      screen.queryByRole('link', { name: 'View tickets' }),
    ).not.toBeInTheDocument()
  })
})

describe('ticket detail', () => {
  it('renders validated tickets with real QR data and Kenangan branding', async () => {
    api.voucher.mockResolvedValue({
      data: {
        tickets: [
          {
            code: 'REAL-CODE',
            name: 'Guest',
            kategori: 'Presale',
            event_name: 'Kenangan Festival',
          },
        ],
      },
    })
    show(<OrderDetailPage />, '/order-detail?token=valid')
    expect(await screen.findByText('REAL-CODE')).toBeInTheDocument()
    expect(await screen.findByAltText('QR code for ticket 1')).toHaveAttribute(
      'src',
      'data:image/png;base64,qr',
    )
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
  })
  it('shows missing and invalid token states without fabricated tickets', async () => {
    const view = show(<OrderDetailPage />, '/order-detail')
    expect(screen.getByRole('alert')).toHaveTextContent(/reference/)
    view.unmount()
    api.voucher.mockRejectedValue(new Error('Invalid ticket reference'))
    show(<OrderDetailPage />, '/order-detail?token=invalid')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid ticket reference',
    )
  })
})
