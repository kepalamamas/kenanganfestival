import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { config } from '../api'

let scriptPromise
function loadScript() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = resolve
      script.onerror = () => {
        script.remove()
        scriptPromise = undefined
        reject(new Error('Verification could not load. Refresh to try again.'))
      }
      document.head.append(script)
    })
  }
  return scriptPromise
}

export default function Turnstile({ ref, onVerify }) {
  const container = useRef(null)
  const widget = useRef(null)
  const callback = useRef(onVerify)
  callback.current = onVerify
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (config.turnstileKey)
      loadScript()
        .then(() => {
          if (!active) return
          widget.current = window.turnstile.render(container.current, {
            sitekey: config.turnstileKey,
            size: 'flexible',
            callback: (token) => callback.current(token),
            'expired-callback': () => callback.current(''),
            'error-callback': () => callback.current(''),
          })
        })
        .catch((reason) => {
          if (active) setError(reason.message)
        })
    return () => {
      active = false
      if (widget.current !== null) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [])
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widget.current !== null) window.turnstile?.reset(widget.current)
      callback.current('')
    },
  }))
  return (
    <div className="verification">
      {!config.turnstileKey || error ? (
        <p role="alert" className="form-error">
          {error ||
            'Verification is not configured yet. Please check back soon.'}
        </p>
      ) : (
        <div ref={container} />
      )}
    </div>
  )
}
