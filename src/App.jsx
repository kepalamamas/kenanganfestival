import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { EventProvider } from './EventContext'
import LandingPage from './pages/LandingPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentResultPage from './pages/PaymentResultPage'
import OrderDetailPage from './pages/OrderDetailPage'
import PurchaseLayout from './components/PurchaseLayout'

function ScrollPosition() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash && !location.hash.includes('=')) {
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView?.({ behavior: 'smooth' })
    } else window.scrollTo?.(0, 0)
  }, [location.pathname, location.hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollPosition />
      <Routes>
        <Route
          path="/"
          element={
            <EventProvider>
              <LandingPage />
            </EventProvider>
          }
        />
        <Route
          path="/checkout"
          element={
            <EventProvider>
              <CheckoutPage />
            </EventProvider>
          }
        />
        <Route path="/payment-success" element={<PaymentResultPage />} />
        <Route path="/payment-failed" element={<PaymentResultPage failed />} />
        <Route path="/order-detail" element={<OrderDetailPage />} />
        <Route
          path="*"
          element={
            <PurchaseLayout title="Page not found">
              <h1>Page not found</h1>
              <Link className="purchase-button" to="/">
                Back to festival
              </Link>
            </PurchaseLayout>
          }
        />
      </Routes>
    </>
  )
}
