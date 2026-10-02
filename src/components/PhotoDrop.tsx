// A place to drop photos from the computer (laptop users drag them in from a
// folder). Wraps the photo area of a form; the file picker inside it keeps
// working as before. While one is on the page, a photo dropped just outside
// it is ignored rather than opened by the browser — which would leave the
// page and lose what was typed. `accept` keeps other files too (Add a
// delivery takes the invoice's PDF as well as photos of a paper one).
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'

const hasFiles = (e: { dataTransfer: DataTransfer | null }) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

/** A file input hidden inside its label (sr-only): the label shows the keyboard focus instead. */
export const fileFocus = 'has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand-orange'

/** A picture (by its type, or its name when the computer gives no type). */
const isImageFile = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i.test(f.name)

export default function PhotoDrop({
  onFiles,
  disabled = false,
  className = '',
  children,
  accept = isImageFile,
}: {
  /** The pictures dropped (or the files `accept` keeps), in the order given; the rest left out; may be empty. */
  onFiles: (files: File[], droppedCount: number) => void
  disabled?: boolean
  className?: string
  children: ReactNode
  /** Which dropped files to keep: pictures, unless told otherwise. */
  accept?: (f: File) => boolean
}) {
  const [over, setOver] = useState(false)
  const depth = useRef(0)

  // A near miss mustn't navigate away to the photo.
  useEffect(() => {
    const stop = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return
      e.preventDefault()
      if (e.type === 'dragover' && !(e.target instanceof Element && e.target.closest('[data-photo-drop]'))) e.dataTransfer.dropEffect = 'none'
    }
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
    }
  }, [])

  const enter = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth.current += 1
    setOver(true)
  }
  const overIt = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }
  const leave = () => {
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setOver(false)
  }
  const drop = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth.current = 0
    setOver(false)
    if (disabled) return
    const all = Array.from(e.dataTransfer.files ?? [])
    onFiles(all.filter(accept), all.length)
  }

  return (
    <div
      data-photo-drop=""
      onDragEnter={enter}
      onDragOver={overIt}
      onDragLeave={leave}
      onDrop={drop}
      className={`rounded-xl border-2 border-dashed transition ${over && !disabled ? 'border-brand-blue bg-brand-blue-50' : 'border-slate-300'} ${className}`}
    >
      {children}
    </div>
  )
}
