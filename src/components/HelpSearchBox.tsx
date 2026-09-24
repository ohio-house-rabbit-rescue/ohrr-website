// The Bunny Help box for the home page (and anywhere else it is useful): one
// search field with three tappable example questions. Typing and pressing
// Enter — or tapping a question — opens /help with those words, where the
// matching OHRR topics appear. The placeholder stays put (nothing moves on its
// own on this site). Ported from the OHRR app's features/bunnyhelp/HomeSearch.tsx.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './icons'

// Real questions, each landing on one of OHRR's topics.
export const EXAMPLE_QUESTIONS = ['Did my bunny stop eating?', 'Why is my bunny hiding?', 'Does my bunny have diarrhea?']

export function helpSearchHref(q: string): string {
  const t = q.trim()
  return t ? `/help?q=${encodeURIComponent(t)}` : '/help'
}

export function HelpSearchBox({
  title = 'Is something up with your bunny?',
  className = '',
  compact = false,
}: {
  title?: string
  className?: string
  /** No heading or intro — the page around it already says what this is. */
  compact?: boolean
}) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    navigate(helpSearchHref(q))
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {!compact && (
        <>
          <p className="font-display text-xl font-extrabold text-ink">{title}</p>
          <p className="text-base leading-relaxed text-slate-600">
            Ask it the way you’d ask a friend. You’ll get OHRR’s own guidance, never a diagnosis.
          </p>
        </>
      )}
      <form onSubmit={onSubmit} role="search" className="flex flex-col gap-2 sm:flex-row">
        <span className="relative block flex-1">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Did my bunny stop eating?"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Ask about your bunny — search Bunny Help"
            className="w-full rounded-full border border-brand-blue/30 bg-white py-3 pl-12 pr-4 text-base text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </span>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-blue px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-brand-blue-dark"
        >
          Ask Bunny Help
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => navigate(helpSearchHref(question))}
            className="min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}

export default HelpSearchBox
