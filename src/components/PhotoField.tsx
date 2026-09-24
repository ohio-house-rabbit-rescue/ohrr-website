// "Add a photo" on a public form (website mirror of the app's PhotoField): a
// file picker — which on a phone offers the camera — with the upload handled
// for you. Used by the found-rabbit report and the Happy Tails form, where a
// picture says more than a paragraph.
import { useRef, useState, type ChangeEvent } from 'react'
import { Icon } from './icons'
import { btn } from './ui'
import { uploadPublicPhoto } from '../lib/publicUpload'

export default function PhotoField({
  label = 'Photo',
  hint,
  value,
  onChange,
  onBusyChange,
}: {
  label?: string
  hint?: string
  /** The uploaded photo's URL, or '' for none. */
  value: string
  onChange: (url: string) => void
  /** True while a photo is uploading — forms disable Send. */
  onBusyChange?: (busy: boolean) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const setWorking = (b: boolean) => {
    setBusy(b)
    onBusyChange?.(b)
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setWorking(true)
    setPreview(URL.createObjectURL(file))
    try {
      onChange(await uploadPublicPhoto(file))
    } catch (err) {
      setPreview(null)
      onChange('')
      setError(err instanceof Error ? err.message : 'That photo didn’t send.')
    } finally {
      setWorking(false)
    }
  }

  const shown = preview ?? (value || null)
  return (
    <div>
      <span className="block text-sm font-semibold text-slate-700">
        {label} <span className="font-normal text-slate-600">(optional)</span>
      </span>
      {hint && <span className="mt-0.5 block text-sm text-slate-600">{hint}</span>}
      <div className="mt-2 flex items-center gap-4">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-500">
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <Icon name="camera" size={32} />}
        </span>
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={`${btn.blue} gap-2 disabled:opacity-60`}
          >
            <Icon name="camera" size={18} /> {busy ? 'Sending photo…' : shown ? 'Choose a different photo' : 'Choose a photo'}
          </button>
          {shown && !busy && (
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                onChange('')
              }}
              className="text-sm font-bold text-slate-600"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {error && <p className="mt-1.5 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  )
}
