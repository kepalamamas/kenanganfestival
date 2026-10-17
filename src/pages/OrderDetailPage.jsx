import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import QRCode from 'qrcode'
import ReactMarkdown from 'react-markdown'
import { api } from '../api'
import { unwrapVoucher } from '../purchase'
import { header } from '../assets'
import PurchaseLayout, { Notice } from '../components/PurchaseLayout'

const detailFields = [
  ['Buyer name', 'buyer_name'],
  ['Buyer ID number', 'buyer_identity_number'],
  ['Attendee name', 'name'],
  ['Email', 'email'],
  ['Phone', 'phone'],
  ['ID number', 'identity_number'],
  ['Date of birth', 'date_of_birth'],
  ['Company', 'company'],
  ['Address', 'address'],
  ['Emergency contact', 'emergency_contact'],
  ['Dietary requirements', 'dietary_requirements'],
  ['Special needs', 'special_needs'],
  ['Valid date', 'schedule'],
]

function Ticket({ ticket, voucher, index, total }) {
  const [qr, setQr] = useState('')
  const [qrError, setQrError] = useState(false)
  const code = typeof ticket.code === 'string' ? ticket.code : ''
  useEffect(() => {
    let active = true
    if (code)
      QRCode.toDataURL(code, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
        .then((image) => {
          if (active) setQr(image)
        })
        .catch(() => {
          if (active) setQrError(true)
        })
    return () => {
      active = false
    }
  }, [code])
  const eventName =
    ticket.event_name || voucher.event_name || 'Kenangan Festival'
  const terms =
    typeof voucher.tnc_content === 'string' ? voucher.tnc_content : ''
  return (
    <article className="voucher-ticket">
      <header className="voucher-header">
        <img src={header} alt="Kenangan Festival artwork" />
        <div>
          <p className="eyebrow">E-TICKET</p>
          <h1>{eventName}</h1>
          <p>
            Valid for 1 person{' '}
            <span className="ticket-counter">
              Ticket {index + 1} of {total}
            </span>
          </p>
        </div>
      </header>
      <div className="voucher-content">
        <section aria-label={`Ticket ${index + 1} details`}>
          <h2>Ticket details</h2>
          <dl className="ticket-details">
            <div>
              <dt>Category</dt>
              <dd>{ticket.kategori || ticket.category_name || '-'}</dd>
            </div>
            {detailFields
              .filter(
                ([, key]) =>
                  ticket[key] !== undefined &&
                  ticket[key] !== null &&
                  ticket[key] !== '',
              )
              .map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{String(ticket[key])}</dd>
                </div>
              ))}
            {(voucher.location || ticket.location) && (
              <div>
                <dt>Venue</dt>
                <dd>{String(ticket.location || voucher.location)}</dd>
              </div>
            )}
            {ticket.uses_seating &&
              [
                ['Section', ticket.section_name],
                ['Door', ticket.door],
                [
                  'Row / seat',
                  [ticket.row_label, ticket.seat_number || ticket.seat]
                    .filter(Boolean)
                    .join(' / '),
                ],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            {ticket.show_queue_number && ticket.queue_number && (
              <div>
                <dt>Queue number</dt>
                <dd>{ticket.queue_number}</dd>
              </div>
            )}
          </dl>
        </section>
        <div className="voucher-qr">
          {!code ? (
            <Notice>
              Ticket code unavailable. Please contact customer service.
            </Notice>
          ) : (
            <>
              {qr ? (
                <img src={qr} alt={`QR code for ticket ${index + 1}`} />
              ) : (
                <div className="qr-placeholder" role="status">
                  {qrError
                    ? 'QR unavailable. Use the ticket code below.'
                    : 'Preparing QR...'}
                </div>
              )}
              <strong>{code}</strong>
              <span>Keep your ticket code private</span>
            </>
          )}
        </div>
      </div>
      <section className="voucher-terms">
        <h2>Terms &amp; Conditions</h2>
        {terms ? (
          <ReactMarkdown>{terms}</ReactMarkdown>
        ) : (
          <p>
            Present this e-ticket at the event entrance. Each ticket admits one
            person. Keep your ticket and identity document ready. Contact
            customer service for admission and ticket collection requirements.
          </p>
        )}
      </section>
    </article>
  )
}

export default function OrderDetailPage() {
  const [search] = useSearchParams()
  const token = search.get('token')
  const [state, setState] = useState({ token: null, voucher: null, error: '' })
  useEffect(() => {
    if (!token) return undefined
    const controller = new AbortController()
    api
      .voucher(token, controller.signal)
      .then(unwrapVoucher)
      .then((voucher) => {
        if (!controller.signal.aborted) setState({ token, voucher, error: '' })
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setState({ token, voucher: null, error: reason.message })
      })
    return () => controller.abort()
  }, [token])
  const current = state.token === token
  return (
    <PurchaseLayout title="Your tickets">
      {!token ? (
        <Notice>
          Your ticket reference is missing. Open the ticket link from your
          confirmation email.
        </Notice>
      ) : !current ? (
        <Notice loading>Loading your tickets...</Notice>
      ) : state.error ? (
        <Notice>{state.error}</Notice>
      ) : (
        <>
          <div className="ticket-toolbar">
            <h1>Your tickets</h1>
            <button
              className="purchase-button secondary"
              onClick={() => window.print()}
            >
              <Printer size={18} /> Print tickets
            </button>
          </div>
          {state.voucher.tickets.map((ticket, index) => (
            <Ticket
              key={ticket.code || index}
              ticket={ticket}
              voucher={state.voucher}
              index={index}
              total={state.voucher.tickets.length}
            />
          ))}
        </>
      )}
    </PurchaseLayout>
  )
}
