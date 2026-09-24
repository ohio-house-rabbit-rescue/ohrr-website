import { ext } from './ui'
import { emergencyVet, wildOrDomestic } from '../data/found'

// "Hurt?" — the app's note on the found-rabbit pages: OHRR's volunteers can't
// respond to emergencies; an injured rabbit needs a vet, a wild one the Ohio
// Wildlife Center. Other organisations' numbers are fine to show and tap.
export default function HurtNote({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-brand-orange/30 bg-brand-orange-50/60 p-5 text-base leading-relaxed text-slate-700 ${className}`}>
      <p>
        <strong className="text-ink">Hurt?</strong> OHRR is run by volunteers and can’t respond to emergencies. An injured
        rabbit needs a vet —{' '}
        <a href={emergencyVet.phoneHref} className="font-bold text-brand-blue">
          {emergencyVet.name}
        </a>{' '}
        sees exotic pets 24/7 (call{' '}
        <a href={emergencyVet.phoneHref} className="font-bold text-brand-blue">
          {emergencyVet.phone}
        </a>
        ). A wild rabbit? Contact the{' '}
        <a href={wildOrDomestic.wildUrl} {...ext} className="font-bold text-brand-blue">
          Ohio Wildlife Center
        </a>
        .
      </p>
    </div>
  )
}
