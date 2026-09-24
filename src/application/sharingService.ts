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
 *   +880 + +8801712345678 -> 8801712345678
 */
export function normalizeContactPhone(contact: TrustedContact): string {
  const raw = (contact.mobile ?? '').trim()

  if (!raw) return ''

  // User pasted a number that already contains the + country code.
  if (raw.startsWith('+')) {
    return raw.replace(/\D/g, '')
  }

  // User pasted an international number using 00.
  if (raw.startsWith('00')) {
    return raw.slice(2).replace(/\D/g, '')
  }

  const local = raw.replace(/\D/g, '')

  if (!local) return ''

  const selectedCode = (
    contact.countryCode || DEFAULT_COUNTRY_CODE
  ).replace(/\D/g, '')

  // Prevent older international numbers such as
  // 8801712345678 from becoming 8808801712345678.
  if (
    local.length > selectedCode.length + 6 &&
    local.startsWith(selectedCode)
  ) {
    return local
  }

  // Remove the domestic leading zero(s).
  const national = local.replace(/^0+/, '')

  return `${selectedCode}${national}`
}

function isValidInternationalPhone(phone: string): boolean {
  // E.164 allows a maximum of 15 digits.
  // The lower bound prevents accidentally opening WhatsApp
  // with only a country code.
  return /^\d{7,15}$/.test(phone)
}

async function openWhatsApp(
  phone: string,
  encodedMessage: string
): Promise<ShareStatus> {
  const deepLink = `whatsapp://send?phone=${phone}&text=${encodedMessage}`
  const webLink = `https://wa.me/${phone}?text=${encodedMessage}`

  return await new Promise<ShareStatus>((resolve) => {
    let settled = false

    const cleanup = () => {
      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      )

      window.clearTimeout(fallbackTimer)
    }

    const finish = (status: ShareStatus) => {
      if (settled) return

      settled = true
      cleanup()
      resolve(status)
    }

    const onVisibilityChange = () => {
      // When the native WhatsApp application opens,
      // the Capacitor WebView becomes hidden.
      if (document.visibilityState === 'hidden') {
        finish('opened')
      }
    }

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange
    )

    // IMPORTANT:
    // This must be const because it is assigned only once.
    const fallbackTimer = window.setTimeout(() => {
      if (settled) return

      try {
        // If the native WhatsApp application did not open,
        // use WhatsApp's universal web link.
        window.location.href = webLink
      } finally {
        finish('opened')
      }
    }, 1200)

    try {
      // First try to open the native WhatsApp application.
      window.location.href = deepLink
    } catch {
      // If that fails, the fallback timer will open wa.me.
    }
  })
}

export async function openComposer(
  method: Method,
  contact: TrustedContact,
  message: string
): Promise<ShareStatus> {
  const encoded = encodeURIComponent(message)
  const phone = normalizeContactPhone(contact)
  const email = contact.email?.trim() ?? ''

  try {
    if (
      (method === 'WhatsApp' || method === 'SMS') &&
      !isValidInternationalPhone(phone)
    ) {
      return 'unavailable'
    }

    if (method === 'SMS') {
      window.location.href = `sms:+${phone}?body=${encoded}`
      return 'opened'
    }

    if (method === 'Email') {
      if (!email) return 'unavailable'

      window.location.href =
        `mailto:${encodeURIComponent(email)}` +
        `?subject=${encodeURIComponent('A message from CareCycle')}` +
        `&body=${encoded}`

      return 'opened'
    }

    if (method === 'WhatsApp') {
      // Prefer the native WhatsApp application.
      // If it cannot be opened, fall back to wa.me.
      return await openWhatsApp(phone, encodedMessageSafe(encoded))
    }

    await Share.share({
      title: 'CareCycle message',
      text: message,
      dialogTitle:
        method === 'Messenger'
          ? 'Choose Messenger or another app'
          : 'Share your message'
    })

    return 'opened'
  } catch {
    return 'failed'
  }
}

/**
 * Keeps the encoded message value safe and explicit.
 */
function encodedMessageSafe(encodedMessage: string): string {
  return encodedMessage
}
