import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock3, Minus, Plus, X } from 'lucide-react'
import { useEvent } from '../EventContext'
import { api } from '../api'
import {
  categoryStatus,
  estimateTotal,
  money,
  paymentUrl,
  quantityBounds,
} from '../purchase'
import { header } from '../assets'
import PurchaseLayout, { Notice } from '../components/PurchaseLayout'
import Turnstile from '../components/Turnstile'

function Field({
  name,
  label,
  config = {},
  value,
  onChange,
  required = false,
}) {
  const props = {
    id: name,
    name,
    value: value || '',
    required: required || !!config.required,
    onChange: (event) => onChange(event.target.value),
  }
  const type = ['text', 'email', 'tel', 'date', 'number'].includes(config.type)
    ? config.type
    : 'text'
  return (
    <label className="input-field" htmlFor={name}>
      {label || config.label || name}
      {config.type === 'select' ? (
        <select {...props}>
          <option value="">Select...</option>
          {(config.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : config.type === 'textarea' ? (
        <textarea {...props} rows={3} maxLength={2000} />
      ) : (
        <input
          {...props}
          type={type}
          maxLength={254}
          placeholder={config.placeholder}
        />
      )}
    </label>
  )
}

function CheckoutForm({ event, form, open, onPayment }) {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const available = (event.categories || []).filter(
    (category) => categoryStatus(category, open) === 'Buy ticket',
  )
  const initial =
    available.find(
      (category) => String(category.id) === search.get('category_id'),
    ) || available[0]
  const [selectedId, setSelectedId] = useState(String(initial?.id || ''))
  const category = available.find((item) => String(item.id) === selectedId)
  const bounds = quantityBounds(event, category || {})
  const [quantity, setQuantity] = useState(
    () => quantityBounds(event, initial || {}).min,
  )
  const [buyer, setBuyer] = useState({
    name: '',
    email: '',
    phone: '',
    identity_number: '',
  })
  const [passengers, setPassengers] = useState([])
  const [voucher, setVoucher] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [seconds, setSeconds] = useState(
    (Number(event.checkout_time) || 10) * 60,
  )
  const turnstile = useRef(null)
  const submittingRef = useRef(false)
  const fields = form?.fields || {}
  const attendeeFields = Object.entries(fields).filter(
    ([key, value]) =>
      value.enabled && !['buyer_identity_number', 'email'].includes(key),
  )
  if (!attendeeFields.length)
    attendeeFields.push([
      'name',
      { enabled: true, required: true, label: 'Attendee name' },
    ])
  const needsVoucher =
    event.is_voucher_mandatory || category?.is_voucher_mandatory
  const totals = estimateTotal(event, category?.price || 0, quantity)

  useEffect(() => {
    const deadline =
      Date.now() + (Number(event.checkout_time) || 10) * 60 * 1000
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSeconds(remaining)
      if (!remaining && !submittingRef.current)
        navigate('/#tickets', { replace: true })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [event.checkout_time, navigate])

  function chooseCategory(id) {
    const next = available.find((item) => String(item.id) === id)
    setSelectedId(id)
    setQuantity(quantityBounds(event, next || {}).min)
    setToken('')
    turnstile.current?.reset()
  }

  async function submit(submitEvent) {
    submitEvent.preventDefault()
    if (submittingRef.current || !category || !agreed || !confirmed || !token)
      return
    if (quantity < bounds.min || quantity > bounds.max) {
      setError('Select a valid ticket quantity.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    try {
      const response = await api.checkout({
        event_id: event.id,
        detail: [
          { category_id: category.id, quantity, category_name: category.name },
        ],
        orderInfo: buyer,
        passengers: event.is_no_ticket_holder
          ? []
          : Array.from(
              { length: quantity },
              (_, index) => passengers[index] || {},
            ),
        is_aggree: true,
        turnstile_token: token,
        ...(voucher.trim() ? { voucher_code: voucher.trim() } : {}),
      })
      const destination = paymentUrl(response.payment_url)
      onPayment(destination)
    } catch (reason) {
      setError(reason.message || 'Checkout failed. Please try again.')
      setToken('')
      turnstile.current?.reset()
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  if (!category || bounds.max < bounds.min)
    return (
      <Notice>
        No tickets are currently available. Please return to the festival to
        check availability.
      </Notice>
    )

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">KENANGAN FESTIVAL</p>
          <h1>Checkout</h1>
        </div>
        <p className="checkout-timer" role="timer">
          <Clock3 size={18} aria-hidden="true" /> {Math.floor(seconds / 60)}:
          {String(seconds % 60).padStart(2, '0')}
        </p>
      </div>
      <form className="checkout-grid" onSubmit={submit}>
        <div className="checkout-form">
          <Link
            className="close-checkout icon-button"
            to="/#tickets"
            aria-label="Close checkout"
            title="Close checkout"
          >
            <X size={20} />
          </Link>
          <section className="form-section">
            <h2>Your tickets</h2>
            <label className="input-field" htmlFor="category">
              Ticket category
              <select
                id="category"
                value={selectedId}
                onChange={(change) => chooseCategory(change.target.value)}
                disabled={submitting}
              >
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {money(item.price)}
                  </option>
                ))}
              </select>
            </label>
            <div className="quantity-row">
              <label htmlFor="quantity">Ticket quantity</label>
              <div className="quantity-control">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Decrease quantity"
                  title="Decrease quantity"
                  disabled={quantity <= bounds.min || submitting}
                  onClick={() => setQuantity((value) => value - 1)}
                >
                  <Minus size={18} />
                </button>
                <input
                  id="quantity"
                  type="number"
                  min={bounds.min}
                  max={bounds.max}
                  value={quantity}
                  readOnly
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Increase quantity"
                  title="Increase quantity"
                  disabled={quantity >= bounds.max || submitting}
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </section>
          <section className="form-section">
            <h2>Buyer details</h2>
            <div className="field-grid">
              {[
                ['name', 'Buyer name', 'text'],
                ['email', 'Email', 'email'],
                ['phone', 'Phone', 'tel'],
              ].map(([key, label, type]) => (
                <Field
                  key={key}
                  name={`buyer-${key}`}
                  label={label}
                  config={{ type }}
                  required
                  value={buyer[key]}
                  onChange={(value) =>
                    setBuyer((previous) => ({ ...previous, [key]: value }))
                  }
                />
              ))}
              {fields.buyer_identity_number?.enabled && (
                <Field
                  name="buyer-identity"
                  config={fields.buyer_identity_number}
                  label={
                    fields.buyer_identity_number.label || 'Buyer ID number'
                  }
                  value={buyer.identity_number}
                  onChange={(value) =>
                    setBuyer((previous) => ({
                      ...previous,
                      identity_number: value,
                    }))
                  }
                />
              )}
            </div>
          </section>
          {!event.is_no_ticket_holder &&
            Array.from({ length: quantity }, (_, index) => (
              <section className="form-section" key={index}>
                <div className="section-title">
                  <h2>Attendee {index + 1}</h2>
                  {index === 0 && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        setPassengers((previous) => [
                          { ...previous[0], ...buyer },
                          ...previous.slice(1),
                        ])
                      }
                    >
                      Use buyer details
                    </button>
                  )}
                </div>
                <div className="field-grid">
                  {attendeeFields.map(([key, field]) => (
                    <Field
                      key={key}
                      name={`attendee-${index}-${key}`}
                      config={field}
                      label={field.label || key}
                      value={passengers[index]?.[key]}
                      onChange={(value) =>
                        setPassengers((previous) => {
                          const next = [...previous]
                          next[index] = { ...next[index], [key]: value }
                          return next
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          <section className="form-section">
            <h2>Before you pay</h2>
            <Field
              name="voucher"
              label={`Voucher code (${needsVoucher ? 'required' : 'optional'})`}
              required={!!needsVoucher}
              value={voucher}
              onChange={setVoucher}
            />
            <label className="consent">
              <input
                type="checkbox"
                checked={confirmed}
                required
                onChange={(change) => setConfirmed(change.target.checked)}
              />
              I confirm the buyer and attendee details are correct.
            </label>
            <label className="consent">
              <input
                type="checkbox"
                checked={agreed}
                required
                onChange={(change) => setAgreed(change.target.checked)}
              />
              I agree to the event Terms &amp; Conditions and ticket collection
              policy.
            </label>
            <details className="checkout-terms">
              <summary>Terms &amp; Conditions</summary>
              <p>
                Each ticket admits one person. Present your valid e-ticket at
                the event entrance. Keep your ticket code private. Contact
                customer service for the event's admission and ticket collection
                requirements before purchasing.
              </p>
            </details>
            <Turnstile ref={turnstile} onVerify={setToken} />
            {error && <Notice>{error}</Notice>}
            <button
              className="purchase-button pay-button"
              type="submit"
              disabled={submitting || !confirmed || !agreed || !token}
            >
              {submitting ? 'Processing...' : 'Pay now'}
            </button>
          </section>
        </div>
        <aside className="order-summary">
          <img src={header} alt="Kenangan Festival artwork" />
          <div className="summary-content">
            <p className="eyebrow">ORDER SUMMARY</p>
            <h2>{event.name}</h2>
            <p>
              {category.name} <span>× {quantity}</span>
            </p>
            <dl>
              {[
                ['Tickets', totals.subtotal],
                ['Platform fee', totals.fee],
                [event.include_tax ? 'Tax included' : 'Tax', totals.tax],
                ['Transaction fee', totals.transaction],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{money(value)}</dd>
                </div>
              ))}
              <div className="summary-total">
                <dt>Estimated total</dt>
                <dd>{money(totals.total)}</dd>
              </div>
            </dl>
            <p className="summary-note">
              Final total, including any voucher discount, is confirmed on the
              payment page.
            </p>
          </div>
        </aside>
      </form>
    </>
  )
}

export default function CheckoutPage({
  onPayment = (url) => window.location.assign(url),
}) {
  const state = useEvent()
  return (
    <PurchaseLayout title="Checkout">
      {state.loading ? (
        <Notice loading>Loading checkout...</Notice>
      ) : state.error ? (
        <>
          <Notice>{state.error}</Notice>
          <button className="purchase-button" onClick={state.reload}>
            Try again
          </button>
        </>
      ) : !state.open || !state.event ? (
        <Notice>Ticket sales are currently closed.</Notice>
      ) : (
        <CheckoutForm
          event={state.event}
          form={state.form}
          open={state.open}
          onPayment={onPayment}
        />
      )}
    </PurchaseLayout>
  )
}
