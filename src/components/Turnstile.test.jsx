import { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Turnstile from './Turnstile'
import { config } from '../api'

vi.mock('../api', () => ({ config: { turnstileKey: '' } }))
afterEach(() => {
  delete window.turnstile
  config.turnstileKey = ''
  document
    .querySelectorAll('script[src*="turnstile"]')
    .forEach((script) => script.remove())
})

it('fails closed without public site key', () => {
  render(<Turnstile onVerify={vi.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent('not configured')
})

it('renders, resets, expires, and removes even a widget with ID zero', async () => {
  config.turnstileKey = 'public-key'
  let options
  window.turnstile = {
    render: vi.fn((container, settings) => {
      options = settings
      return 0
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
  const callback = vi.fn()
  const ref = createRef()
  const view = render(<Turnstile ref={ref} onVerify={callback} />)
  await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledOnce())
  act(() => {
    options.callback('verified')
    options['expired-callback']()
    options['error-callback']()
    ref.current.reset()
  })
  expect(callback).toHaveBeenCalledWith('verified')
  expect(callback).toHaveBeenCalledWith('')
  expect(window.turnstile.reset).toHaveBeenCalledWith(0)
  view.unmount()
  expect(window.turnstile.remove).toHaveBeenCalledWith(0)
})

it('shows an actionable script loading failure', async () => {
  config.turnstileKey = 'public-key'
  render(<Turnstile onVerify={vi.fn()} />)
  fireEvent.error(document.querySelector('script[src*="turnstile"]'))
  expect(await screen.findByRole('alert')).toHaveTextContent('could not load')
})

it('loads explicit-render script and does not mount a widget after unmount', async () => {
  config.turnstileKey = 'public-key'
  const view = render(<Turnstile onVerify={vi.fn()} />)
  const script = document.querySelector('script[src*="turnstile"]')
  expect(script.src).toContain('render=explicit')
  view.unmount()
  window.turnstile = { render: vi.fn() }
  await act(async () => fireEvent.load(script))
  expect(window.turnstile.render).not.toHaveBeenCalled()
})
