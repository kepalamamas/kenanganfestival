import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleCheck, CircleX, Clock3 } from 'lucide-react'
import { api } from '../api'
import { unwrapVoucher } from '../purchase'
import PurchaseLayout, { Notice } from '../components/PurchaseLayout'
import { header } from '../assets'

export default function PaymentResultPage({ failed = false }) {
  const [search] = useSearchParams()
  const orderId = search.get('order_id')
  const token = search.get('token')
  const [validation, setValidation] = useState(null)

  useEffect(() => {
    if (!token) return undefined
    const controller = new AbortController()
    api
      .voucher(token, controller.signal)
      .then(unwrapVoucher)
      .then(() => {
        if (!controller.signal.aborted)
          setValidation({ token, confirmed: true })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setValidation({ token, confirmed: false, error: error.message })
      })
    return () => controller.abort()
  }, [token])

  const current = validation?.token === token
  const confirmed = current && validation.confirmed
  const title = confirmed
    ? 'Payment confirmed'
    : failed
      ? 'Payment not completed'
      : 'Payment processing'
  const Icon = confirmed ? CircleCheck : failed ? CircleX : Clock3

  return (
    <PurchaseLayout title={title}>
      <div className="result-layout">
        <img
          className="result-artwork"
          src={header}
          alt="Kenangan Festival artwork"
        />
        <section className="result-content">
          <Icon className="result-icon" size={44} aria-hidden="true" />
          <p className="eyebrow">KENANGAN FESTIVAL</p>
          <h1>{title}</h1>
          {orderId && <p className="order-reference">Order {orderId}</p>}
          {!orderId && !token ? (
            <Notice>
              Your payment reference is missing. Check your ticket email or
              contact customer service to confirm your order.
            </Notice>
          ) : confirmed ? (
            <>
              <p>Your tickets are ready. See you at Kenangan Festival!</p>
              <Link
                className="purchase-button"
                to={`/order-detail?token=${encodeURIComponent(token)}`}
              >
                View tickets
              </Link>
            </>
          ) : (
            <>
              <p>
                {failed
                  ? 'Payment was not completed on the payment page. If you have already paid, check your email or contact customer service before placing another order.'
                  : 'Your payment is being processed. Once confirmed, your tickets will be sent to the email address used at checkout. Check your confirmation email, including your spam folder.'}
              </p>
              {token && !current && (
                <p role="status">Checking your ticket reference...</p>
              )}
              {current && validation.error && (
                <Notice>{validation.error}</Notice>
              )}
              {failed && (
                <Link className="purchase-button" to="/#tickets">
                  Back to tickets
                </Link>
              )}
            </>
          )}
          <Link className="back-link result-back" to="/">
            Back to festival
          </Link>
        </section>
      </div>
    </PurchaseLayout>
  )
}
