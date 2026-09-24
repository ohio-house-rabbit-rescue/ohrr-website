import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
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
