import CryptoJS from 'crypto-js'

export const config = {
  base: (import.meta.env.VITE_API_BASE || '/api/v1').replace(/\/$/, ''),
  eventSlug: import.meta.env.VITE_EVENT_SLUG || '',
  linkId: import.meta.env.VITE_LINK_ID || '',
  turnstileKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
  payloadKey: import.meta.env.VITE_SECRET_PAYLOAD || '',
}

async function request(path, options = {}) {
  const response = await fetch(`${config.base}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      ...options.headers,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const body = await response.json().catch(() => null)
  if (
    response.status === 429 &&
    (body?.data?.redirectUrl || body?.redirectUrl)
  ) {
    const redirect = new URL(body?.data?.redirectUrl || body.redirectUrl)
    if (redirect.protocol !== 'https:')
      throw new Error('The queue returned an invalid redirect URL.')
    window.location.assign(redirect.href)
    throw new Error('Redirecting to the waiting room...')
  }
  if (!response.ok) {
    const error = new Error(
      body?.error ||
        body?.message ||
        `Request failed (${response.status}). Please try again.`,
    )
    error.code = body?.code
    error.status = response.status
    throw error
  }
  return body
}

export const api = {
  async event(signal) {
    if (!config.eventSlug || !config.linkId)
      throw new Error(
        'Ticket checkout is being prepared. Please check back soon.',
      )
    const gate = await request(
      `/public-events/link-url/${encodeURIComponent(config.linkId)}`,
      { signal },
    )
    if (!gate?.data?.isOpen) return { open: false, event: null, form: null }
    const queueToken = new URLSearchParams(window.location.search).get(
      'queueittoken',
    )
    const suffix = queueToken
      ? `?queueittoken=${encodeURIComponent(queueToken)}`
      : ''
    const event = await request(
      `/public-events/${encodeURIComponent(config.eventSlug)}${suffix}`,
      { signal },
    )
    const form = await request(
      `/public-events/${encodeURIComponent(config.eventSlug)}/form-config`,
      { signal },
    )
    if (queueToken) {
      const url = new URL(window.location.href)
      url.searchParams.delete('queueittoken')
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      )
    }
    return { open: true, event: event.data, form: form.data }
  },
  checkout: async (payload) => {
    if (!config.payloadKey)
      throw new Error('VITE_SECRET_PAYLOAD is required by the checkout API.')
    return request('/categories/checkout', {
      method: 'POST',
      body: JSON.stringify({
        data: CryptoJS.AES.encrypt(
          JSON.stringify(payload),
          config.payloadKey,
        ).toString(),
      }),
    })
  },
  voucher: (token, signal) =>
    request(`/public-check/validate?token=${encodeURIComponent(token)}`, {
      signal,
    }),
}
