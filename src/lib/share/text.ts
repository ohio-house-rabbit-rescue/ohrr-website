// Share plain text (a link, a few lines of numbers): the share sheet when the
// browser offers one (phones, some laptops), otherwise copy it so it can be
// pasted into an email or message. Mirrors shareText in the app's share.ts.
import { copyText } from './share'

export type ShareTextOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareText(text: string, title?: string): Promise<ShareTextOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return 'cancelled'
      // fall through to copying
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed'
}
