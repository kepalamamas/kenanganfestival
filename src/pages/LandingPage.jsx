import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUp,
  Camera,
  Menu,
  Music2,
  X,
} from 'lucide-react'
import { useEvent } from '../EventContext'
import { categoryStatus, money } from '../purchase'
import {
  logo,
  header,
  mobileHeader,
  alternate,
  mobileAlternate,
  venue,
} from '../assets'

const navigation = [
  ['Tickets', 'tickets'],
  ['Playlist', 'venue'],
  ['About Us', 'promoter'],
  ['Contact Us', 'footer'],
]
const countdown = () =>
  Math.max(
    0,
    Math.floor(
      (new Date('2026-11-07T10:00:00+07:00').getTime() - Date.now()) / 1000,
    ),
  )

export default function LandingPage() {
  const state = useEvent()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [slide, setSlide] = useState(0)
  const [time, setTime] = useState(countdown)
  useEffect(() => {
    const clock = window.setInterval(() => setTime(countdown()), 1000)
    const carousel = window.setInterval(
      () => setSlide((value) => (value + 1) % 2),
      5000,
    )
    return () => {
      window.clearInterval(clock)
      window.clearInterval(carousel)
    }
  }, [])
  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  const counts = [
    Math.floor(time / 86400),
    Math.floor((time % 86400) / 3600),
    Math.floor((time % 3600) / 60),
    time % 60,
  ]
  const categories = state.event?.categories || []

  function buy(category) {
    const params = new URLSearchParams(window.location.search)
    params.set('category_id', category.id)
    navigate(`/checkout?${params}`)
  }

  return (
    <>
      <header id="header" className="festival-header">
        <div className="festival-nav container">
          <a href="#intro" aria-label="Kenangan Festival home">
            <img className="festival-logo" src={logo} alt="Kenangan Festival" />
          </a>
          <button
            className="icon-button festival-menu-button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="festival-navigation"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav
            id="festival-navigation"
            className={menuOpen ? 'festival-links is-open' : 'festival-links'}
          >
            {navigation.map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <section
        id="intro"
        className="react-intro"
        aria-label="Kenangan Festival"
      >
        <div className="festival-slides">
          {[
            [header, mobileHeader],
            [alternate, mobileAlternate],
          ].map(([desktop, mobile], index) => (
            <picture
              key={desktop}
              className={
                slide === index ? 'festival-slide is-current' : 'festival-slide'
              }
              aria-hidden={slide !== index}
            >
              <source media="(max-width: 767px)" srcSet={mobile} />
              <img
                src={desktop}
                alt={
                  index
                    ? 'Kenangan Festival alternate artwork'
                    : 'Kenangan Festival header artwork'
                }
                fetchPriority={index ? 'auto' : 'high'}
              />
            </picture>
          ))}
        </div>
      </section>
      <main id="main">
        <section id="about">
          <div className="container">
            <div className="section-header">
              <h2>Menuju Kenangan Festival 2026</h2>
            </div>
            <div className="festival-countdown" aria-label="Festival countdown">
              {counts.map((value, index) => (
                <div className="countdown-unit" key={index}>
                  <strong>{String(value).padStart(2, '0')}</strong>
                  <span>{['HARI', 'JAM', 'MENIT', 'DETIK'][index]}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="tickets">
          <div className="container">
            <div className="section-header">
              <h2>Tickets</h2>
            </div>
            <div className="tickets-venue-image-wrap">
              <img
                src={venue}
                alt="Kenangan Festival venue"
                className="tickets-venue-image"
                loading="lazy"
              />
            </div>
            <div className="festival-ticket-list">
              {state.loading ? (
                <p role="status">Checking ticket availability...</p>
              ) : state.error ? (
                <div className="sale-notice">
                  <p role="alert">{state.error}</p>
                  <button className="purchase-button" onClick={state.reload}>
                    Try again
                  </button>
                </div>
              ) : !state.open ? (
                <p role="status" className="sale-notice">
                  Ticket sales are not open yet. Please check back soon.
                </p>
              ) : categories.length ? (
                categories.map((category) => {
                  const status = categoryStatus(category, state.open)
                  return (
                    <article
                      className="ticket-detail-card festival-ticket"
                      key={category.id}
                    >
                      <div className="ticket-detail-header">
                        <h3 className="header-ticket-detail">
                          {category.name}
                        </h3>
                      </div>
                      <div className="ticket-detail-body">
                        <p className="festival-ticket-price">
                          {money(category.price)}
                        </p>
                        <button
                          className="btn beli-btn"
                          disabled={status !== 'Buy ticket'}
                          onClick={() => buy(category)}
                        >
                          {status}
                        </button>
                        {category.show_last_tickets && (
                          <p>{category.remaining_available} tickets left</p>
                        )}
                      </div>
                    </article>
                  )
                })
              ) : (
                <p role="status">Tickets are currently unavailable.</p>
              )}
            </div>
          </div>
        </section>
        <section id="venue">
          <div className="container">
            <div className="section-header">
              <h2>PLAYLIST KEMBALI KE MANTAN!</h2>
            </div>
            <iframe
              className="festival-playlist"
              title="Kenangan Festival playlist"
              src="https://open.spotify.com/embed/playlist/1RsO7YMgemSsRboItQIbcH?si=9lqQF4AlS5GjluM3YfviHQ"
              height="500"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </section>
        <section id="promoter">
          <div className="container">
            <div className="section-header">
              <h2>About US!</h2>
            </div>
            <div className="about-us-content">
              <p>
                <strong>
                  Kenangan Festival adalah festival pertama dari Kopi Kenangan
                </strong>{' '}
                yang menyatukan kopi, musik, dan momen seru dalam satu perayaan.
              </p>
              <p>
                Dengan tema <strong>"Kembali ke Mantan"</strong>, festival ini
                mau ngajak kamu buat bernostalgia bareng mantan!
                <br />
                Eh, maksudnya, mantan rasa, mantan lagu favorit, mantan cerita,
                sampai mantan momen yang masih punya tempat di hati kamu.
              </p>
              <p>
                Karena setiap kenangan, selalu punya alasan buat dirayakan lagi!
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer id="footer">
        <div className="footer-top">
          <div className="container footer-contact">
            <h2 className="text-hubungi-minsod">HUBUNGI KAMI!</h2>
            {['SPONSORSHIP & PARTNERSHIP', 'CUSTOMER SERVICE'].map((label) => (
              <div className="festival-contact" key={label}>
                <h3>{label}</h3>
                <a href="mailto:hello.sodgroup@gmail.com">
                  hello.sodgroup@gmail.com
                </a>
              </div>
            ))}
            <div className="festival-socials">
              <a
                href="https://www.instagram.com/kenanganfestival/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kenangan Festival Instagram"
                title="Instagram"
              >
                <Camera />
              </a>
              <a
                href="https://open.spotify.com/playlist/1RsO7YMgemSsRboItQIbcH"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kenangan Festival Spotify"
                title="Spotify"
              >
                <Music2 />
              </a>
            </div>
          </div>
        </div>
        <div className="copyright">
          Copyright
          <br />
          <strong>© 2026 Kenangan Festival</strong> All Rights Reserved
        </div>
      </footer>
      <a
        className="festival-back-top icon-button"
        href="#intro"
        aria-label="Back to top"
        title="Back to top"
      >
        <ArrowUp />
      </a>
    </>
  )
}
