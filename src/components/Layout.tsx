import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

// A new page starts at the top — straight away, not with the site's smooth
// scrolling (which can be cut short while the new page draws). A link to a
// place on a page ("/bunfest/vendors#rescues") goes to that place once it has
// been drawn (lists load a moment after the page).
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const last = useRef(pathname)
  useEffect(() => {
    const newPage = last.current !== pathname
    last.current = pathname
    const behavior: ScrollBehavior = newPage ? 'instant' : 'smooth'
    if (!hash) {
      if (newPage) window.scrollTo({ top: 0, behavior })
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    const timer = window.setInterval(() => {
      const el = document.getElementById(id)
      if (el || ++tries > 40) {
        window.clearInterval(timer)
        if (el) el.scrollIntoView({ behavior })
        else if (newPage) window.scrollTo({ top: 0, behavior })
      }
    }, 50)
    return () => window.clearInterval(timer)
  }, [pathname, hash])
  return null
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <ScrollToTop />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
