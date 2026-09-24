// One photo from anyone, for the public forms (website mirror of the app's
// src/lib/publicUpload.ts).
//
// Staff uploads belong to signed-in people; these come from visitors, so they
// go to the `public-uploads` bucket, which anyone may add to and only staff may
// change or remove (app repo: supabase/migrations/20260922130000_*.sql). The
// image is shrunk in the browser first — phone photos are 4000px and the bucket
// caps a file at 8 MB — and the form stores the returned URL with its answers,
// so staff see the picture in the Inbox. Same bucket, same <yyyy-mm>/<uuid>.jpg
// path pattern and same JPEG size as the app, so a photo looks the same to
// staff whichever surface it came from.
import { supabase, isConfigured } from './supabase'

export const PUBLIC_BUCKET = 'public-uploads'
const MAX_EDGE = 1280
const JPEG_QUALITY = 0.85

type Drawable = ImageBitmap | HTMLImageElement

async function loadDrawable(file: Blob): Promise<Drawable> {
  // createImageBitmap honours the camera's EXIF orientation, so portrait shots
  // come out upright. Older browsers fall back to an <img>.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('That file doesn’t look like a photo.'))
      img.src = url
    })
  } finally {
    // Revoking after load is safe: the decoded image is already in memory.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function sizeOf(d: Drawable): { width: number; height: number } {
  if ('naturalWidth' in d) return { width: d.naturalWidth || d.width, height: d.naturalHeight || d.height }
  return { width: d.width, height: d.height }
}

/** A JPEG no larger than MAX_EDGE on its longest side. */
export async function downscaleToJpeg(file: Blob): Promise<Blob> {
  const drawable = await loadDrawable(file)
  const { width, height } = sizeOf(drawable)
  if (!width || !height) throw new Error('Could not read that photo.')
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the photo on this device.')
  ctx.drawImage(drawable, 0, 0, w, h)
  if ('close' in drawable) drawable.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Could not process the photo on this device.')
  return blob
}

function newName(): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const month = new Date().toISOString().slice(0, 7)
  return `${month}/${id}.jpg`
}

/** Shrink and upload one photo; resolves to its public URL. */
export async function uploadPublicPhoto(file: Blob): Promise<string> {
  if (!isConfigured) throw new Error('This site isn’t connected to OHRR yet.')
  const jpeg = await downscaleToJpeg(file)
  const path = newName()
  const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(path, jpeg, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message || 'That photo didn’t send.')
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl
}
