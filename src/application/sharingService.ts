import { Share } from '@capacitor/share'
import type { Method, TrustedContact } from '../domain/models'
import { DEFAULT_COUNTRY_CODE } from '../domain/countryCallingCodes'

export type ShareStatus = 'prepared' | 'opened' | 'cancelled' | 'unavailable' | 'failed'

/**
 * Turns a contact's selected country calling code + local number into
 * the international digits-only format required by WhatsApp/SMS links.
 *
 * Examples:
 *   +880 + 01712345678 -> 8801712345678
 *   +91  + 9876543210  -> 919876543210
 *   +880 + +8801712345678 -> 8801712345678 (backwards-compatible)
 */
export function normalizeContactPhone(contact: TrustedContact): string {
  const raw = (contact.mobile ?? '').trim()
  if (!raw) return ''

  // If a user pasted an already international number, respect it.
  if (raw.startsWith('+')) return raw.replace(/\D/g, '')
  if (raw.startsWith('00')) return raw.slice(2).replace(/\D/g, '')

  const local = raw.replace(/\D/g, '')
  if (!local) return ''

  const selectedCode = (contact.countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '')

  // Also accept an international number pasted without the '+' sign. This
  // prevents older contacts such as 8801712345678 from becoming
  // 8808801712345678 when Bangladesh (+880) is selected.
  if (local.length > selectedCode.length + 6 && local.startsWith(selectedCode)) return local

  // Remove the domestic trunk prefix (normally 0) before adding the
  // international calling code.
  const national = local.replace(/^0+/, '')
  return `${selectedCode}${national}`
}

function isValidInternationalPhone(phone: string): boolean {
  // E.164 numbers are at most 15 digits. Keep a small lower bound so
  // an accidental country code alone cannot open a broken WhatsApp URL.
  return /^\d{7,15}$/.test(phone)
}

async function openWhatsApp(phone: string, encodedMessage: string): Promise<ShareStatus> {
  const deepLink = `whatsapp://send?phone=${phone}&text=${encodedMessage}`
  const webLink = `https://wa.me/${phone}?text=${encodedMessage}`

  return await new Promise<ShareStatus>((resolve) => {
    let settled = false
    let fallbackTimer: number | undefined

    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
    }

    const finish = (status: ShareStatus) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(status)
    }

    const onVisibilityChange = () => {
      // When the native WhatsApp app opens, the Capacitor WebView becomes
      // hidden. In that case we should not redirect back to the web fallback.
      if (document.visibilityState === 'hidden') finish('opened')
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    try {
      // Prefer the native WhatsApp app. This avoids relying on the Android
      // WebView/browser to decide what should handle a wa.me URL.
      window.location.href = deepLink
    } catch {
      // The web fallback below will still be attempted.
    }

    fallbackTimer = window.setTimeout(() => {
      if (settled) return
      cleanup()
      try {
        window.location.href = webLink
      } finally {
        finish('opened')
      }
    }, 1200)
  })
}

export async function openComposer(method: Method, contact: TrustedContact, message: string): Promise<ShareStatus> {
  const encoded = encodeURIComponent(message)
  const phone = normalizeContactPhone(contact)
  const email = contact.email?.trim() ?? ''

  try {
    if ((method === 'WhatsApp' || method === 'SMS') && !isValidInternationalPhone(phone)) {
      return 'unavailable'
    }

    if (method === 'SMS') {
      window.location.href = `sms:+${phone}?body=${encoded}`
      return 'opened'
    }

    if (method === 'Email') {
      if (!email) return 'unavailable'
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('A message from CareCycle')}&body=${encoded}`
      return 'opened'
    }

    if (method === 'WhatsApp') {
      // Prefer the native app, then fall back to WhatsApp's universal link.
      // WhatsApp requires the number after /wa.me/ to be full international
      // digits only (no +, spaces, brackets, dashes, or leading trunk zero).
      return await openWhatsApp(phone, encoded)
    }

    await Share.share({
      title: 'CareCycle message',
      text: message,
      dialogTitle: method === 'Messenger' ? 'Choose Messenger or another app' : 'Share your message'
    })
    return 'opened'
  } catch {
    return 'failed'
  }
}
