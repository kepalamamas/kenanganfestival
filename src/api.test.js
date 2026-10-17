import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import CryptoJS from 'crypto-js'

let api
let fetchMock
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_EVENT_SLUG', 'event-slug')
  vi.stubEnv('VITE_LINK_ID', 'sale-link')
  vi.stubEnv('VITE_API_BASE', '/api/v1')
  vi.stubEnv('VITE_SECRET_PAYLOAD', 'test-only-payload-key')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  api = (await import('./api')).api
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

it('loads sale, event and dynamic form and forwards queue token once', async () => {
  window.history.replaceState(
    {},
    '',
    '/checkout?queueittoken=queue&category_id=2',
  )
  fetchMock
    .mockResolvedValueOnce(response({ data: { isOpen: true } }))
    .mockResolvedValueOnce(response({ data: { id: 1 } }))
    .mockResolvedValueOnce(response({ data: { fields: {} } }))
  expect(await api.event()).toEqual({
    open: true,
    event: { id: 1 },
    form: { fields: {} },
  })
  expect(fetchMock.mock.calls[1][0]).toContain('queueittoken=queue')
  expect(window.location.search).toBe('?category_id=2')
})

it('does not request event data when sale gate is closed', async () => {
  fetchMock.mockResolvedValue(response({ data: { isOpen: false } }))
  expect(await api.event()).toEqual({ open: false, event: null, form: null })
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('fails closed when environment configuration is missing', async () => {
  vi.stubEnv('VITE_EVENT_SLUG', '')
  vi.resetModules()
  const unconfigured = (await import('./api')).api
  await expect(unconfigured.event()).rejects.toThrow('being prepared')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('uses the existing public checkout endpoint without login authorization', async () => {
  fetchMock.mockResolvedValue(response({ order_id: 'order' }))
  expect(await api.checkout({ event_id: 1 })).toEqual({ order_id: 'order' })
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/categories/checkout',
    expect.objectContaining({
      method: 'POST',
      body: expect.any(String),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  const options = fetchMock.mock.calls[0][1]
  expect(JSON.parse(options.body)).toEqual({ data: expect.any(String) })
  const decoded = CryptoJS.AES.decrypt(
    JSON.parse(options.body).data,
    'test-only-payload-key',
  ).toString(CryptoJS.enc.Utf8)
  expect(JSON.parse(decoded)).toEqual({ event_id: 1 })
  expect(options.headers).not.toHaveProperty('Authorization')
})

it('reports missing payload configuration without making a checkout request', async () => {
  vi.stubEnv('VITE_SECRET_PAYLOAD', '')
  vi.resetModules()
  const unconfigured = (await import('./api')).api
  await expect(unconfigured.checkout({})).rejects.toThrow('VITE_SECRET_PAYLOAD')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('uses existing public ticket validation without a custom status API', async () => {
  fetchMock.mockResolvedValue(response({ status: 'pending' }))
  expect(api.status).toBeUndefined()
  await api.voucher('a+b&c')
  expect(fetchMock.mock.calls[0][0]).toContain('token=a%2Bb%26c')
  expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
})

it('preserves verification error codes and HTTP status', async () => {
  fetchMock.mockResolvedValue(
    response(
      { error: 'Expired challenge', code: 'TURNSTILE_REFRESH_REQUIRED' },
      422,
    ),
  )
  await expect(api.checkout({})).rejects.toMatchObject({
    message: 'Expired challenge',
    status: 422,
    code: 'TURNSTILE_REFRESH_REQUIRED',
  })
})

it('handles malformed error bodies without leaking details', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('html')
    },
  })
  await expect(api.voucher('token')).rejects.toThrow('Request failed (502)')
})

it('redirects Queue-it responses to HTTPS and rejects unsafe redirects', async () => {
  const assign = vi.fn()
  vi.stubGlobal('window', {
    location: { assign },
    history: { replaceState: vi.fn() },
  })
  fetchMock.mockResolvedValue(
    response({ redirectUrl: 'https://queue.example.com/wait' }, 429),
  )
  await expect(api.voucher('token')).rejects.toThrow('Redirecting')
  expect(assign).toHaveBeenCalledWith('https://queue.example.com/wait')
  fetchMock.mockResolvedValue(
    response({ data: { redirectUrl: 'javascript:alert(1)' } }, 429),
  )
  await expect(api.voucher('token')).rejects.toThrow('invalid redirect')
})
