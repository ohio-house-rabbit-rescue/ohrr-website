import { supabase } from './supabase'

// Shrink a photo in the browser before upload (phones produce 4000px+ images):
// longest side <= maxPx. JPEG output, except PNG sources keep PNG (and transparency).
// Anything the browser can't decode (e.g. HEIC in some browsers) is uploaded as-is.
export async function downscaleImage(file: File, maxPx = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= 400 * 1024) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85))
  return blob ?? file
}

// Upload to the public `site-images` bucket (the same one the homepage manager uses)
// after downscaling, and return the object's public URL.
export async function uploadSiteImage(file: File, userId: string, maxPx = 1600): Promise<string> {
  const blob = await downscaleImage(file, maxPx)
  const type = blob.type || file.type
  const ext =
    type === 'image/png' ? 'png' : type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('site-images').upload(path, blob, { contentType: type })
  if (error) throw error
  return supabase.storage.from('site-images').getPublicUrl(path).data.publicUrl
}
