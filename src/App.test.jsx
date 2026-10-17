import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import App from './App'
import { api } from './api'

vi.mock('./api', () => ({
  config: { turnstileKey: '' },
  api: { event: vi.fn(), voucher: vi.fn(), status: vi.fn() },
}))

it('keeps festival content and navigates Buy into its checkout', async () => {
  api.event.mockResolvedValue({
    open: true,
    event: {
      id: 'event-1',
      name: 'Kenangan Festival',
      is_no_ticket_holder: true,
      categories: [
        {
          id: 'category-1',
          name: 'Presale 2',
          is_active: true,
          is_available: true,
          is_started: true,
          price: 250000,
        },
      ],
    },
    form: { fields: {} },
  })
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText('Menuju Kenangan Festival 2026')).toBeInTheDocument()
  expect(screen.getByTitle('Kenangan Festival playlist')).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: 'Buy ticket' }))
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Checkout' }),
    ).toBeInTheDocument(),
  )
})

it('fails closed when event configuration cannot load and allows retry', async () => {
  api.event.mockRejectedValue(new Error('Sale unavailable'))
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Sale unavailable')
  expect(
    screen.queryByRole('button', { name: 'Buy ticket' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
})

it('supports menu, keyboard dismissal and ticket states without carousel navigation', async () => {
  api.event.mockResolvedValue({
    open: true,
    event: {
      categories: [
        {
          id: 2,
          name: 'Upcoming',
          is_active: true,
          is_started: false,
          price: 1000,
        },
        {
          id: 3,
          name: 'Last tickets',
          is_active: true,
          is_started: true,
          is_available: true,
          show_last_tickets: true,
          remaining_available: 2,
          price: 2000,
        },
      ],
    },
  })
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(
    await screen.findByRole('button', { name: 'Coming soon' }),
  ).toBeDisabled()
  expect(screen.getByText('2 tickets left')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  fireEvent.click(screen.getByRole('link', { name: 'About Us' }))
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  expect(screen.queryByRole('button', { name: 'Next artwork' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Previous artwork' })).not.toBeInTheDocument()
  expect(screen.queryByText('1 / 2')).not.toBeInTheDocument()
})

it('automatically changes artwork and loops without navigation', async () => {
  vi.useFakeTimers()
  try {
    api.event.mockResolvedValue({ open: false, event: null })
    const view = render(<MemoryRouter><App /></MemoryRouter>)
    await act(async () => {})
    const first = screen.getByAltText('Kenangan Festival header artwork').closest('picture')
    const second = screen.getByAltText('Kenangan Festival alternate artwork').closest('picture')
    expect(first).toHaveAttribute('aria-hidden', 'false')
    await act(async () => vi.advanceTimersByTime(5000))
    expect(second).toHaveAttribute('aria-hidden', 'false')
    expect(first).toHaveAttribute('aria-hidden', 'true')
    await act(async () => vi.advanceTimersByTime(5000))
    expect(first).toHaveAttribute('aria-hidden', 'false')
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})

it('handles closed sales and unknown routes', async () => {
  api.event.mockResolvedValue({ open: false, event: null })
  const view = render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
  expect(await screen.findByText(/not open yet/)).toBeInTheDocument()
  view.unmount()
  render(
    <MemoryRouter initialEntries={['/missing']}>
      <App />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('heading', { name: 'Page not found' }),
  ).toBeInTheDocument()
})
