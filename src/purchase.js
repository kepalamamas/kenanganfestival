export const money = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

export function categoryStatus(category, open) {
  if (!open) return 'Sale closed'
  if (category.section_id) return 'Seat selection required'
  if (!category.is_active || category.is_ended) return 'Sale ended'
  if (!category.is_started) return 'Coming soon'
  if (category.is_full_booked) return 'Fully booked'
  if (!category.is_available) return 'Sold out'
  return 'Buy ticket'
}

export function quantityBounds(event, category) {
  const min = category.is_ticket_limitation
    ? Math.max(1, Number(category.min_ticket) || 1)
    : 1
  const max = Math.min(
    100,
    Number(event.max_purchase) || 100,
    category.is_ticket_limitation ? Number(category.max_ticket) || 100 : 100,
    category.show_last_tickets ? Number(category.remaining_available) : 100,
  )
  return { min, max }
}

export function estimateTotal(event, price, quantity) {
  const subtotal = Number(price) * quantity
  const fee = event.is_persen
    ? ((Number(event.fee) || 0) * subtotal) / 100
    : Number(event.fee) || 0
  const tax = event.include_tax
    ? 0
    : Math.floor(((Number(event.ppn) || 0) * subtotal) / 100)
  const transaction = event.transaction_fee_is_persen
    ? ((Number(event.transaction_fee) || 0) * subtotal) / 100
    : Number(event.transaction_fee) || 0
  return {
    subtotal,
    fee,
    tax,
    transaction,
    total: subtotal + fee + tax + transaction,
  }
}

export function paymentUrl(value) {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    !(url.hostname === 'xendit.co' || url.hostname.endsWith('.xendit.co')) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'The payment provider returned an invalid payment link. Please contact support before retrying.',
    )
  }
  return url.href
}

export function unwrapVoucher(response) {
  let voucher = response
  for (
    let depth = 0;
    depth < 4 && voucher && !Array.isArray(voucher.tickets);
    depth += 1
  ) {
    voucher = voucher.data || voucher.result || voucher.voucher
  }
  if (!voucher?.tickets?.length)
    throw new Error('No tickets were found for this reference.')
  return voucher
}
