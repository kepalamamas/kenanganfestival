import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { logo } from '../assets'

export default function PurchaseLayout({ title, children }) {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${title} | Kenangan Festival`
    const restorers = ['robots', 'referrer'].map((name) => {
      let element = document.querySelector(`meta[name="${name}"]`)
      const existing = !!element
      if (!element) {
        element = document.createElement('meta')
        element.name = name
        document.head.append(element)
      }
      const original = element.content
      element.content = name === 'robots' ? 'noindex, nofollow' : 'no-referrer'
      return () => {
        if (existing) element.content = original
        else element.remove()
      }
    })
    return () => {
      document.title = originalTitle
      restorers.forEach((restore) => restore())
    }
  }, [title])
  return (
    <div className="purchase-shell">
      <header className="purchase-header">
        <Link to="/" aria-label="Kenangan Festival home">
          <img src={logo} alt="Kenangan Festival" />
        </Link>
        <Link className="back-link" to="/#tickets">
          <ArrowLeft size={18} aria-hidden="true" /> Back to festival
        </Link>
      </header>
      <main className="purchase-main">{children}</main>
      <footer className="purchase-footer">
        Kenangan Festival 2026{' '}
        <span>
          Customer service:{' '}
          <a href="mailto:hello.sodgroup@gmail.com">hello.sodgroup@gmail.com</a>
        </span>
      </footer>
    </div>
  )
}

export function Notice({ children, loading = false }) {
  return (
    <p
      className={loading ? 'status-message' : 'form-error'}
      role={loading ? 'status' : 'alert'}
    >
      {children}
    </p>
  )
}
