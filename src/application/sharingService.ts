import { Share } from '@capacitor/share'
import type { Method, TrustedContact } from '../domain/models'
export type ShareStatus = 'prepared' | 'opened' | 'cancelled' | 'unavailable' | 'failed'
export async function openComposer(method: Method, contact: TrustedContact, message: string): Promise<ShareStatus> {
  const encoded = encodeURIComponent(message); const phone = (contact.mobile ?? '').replace(/[^+\d]/g, ''); const email = contact.email ?? ''
  try {
    if (method === 'SMS' && phone) { window.location.href = `sms:${phone}?body=${encoded}`; return 'opened' }
    if (method === 'Email' && email) { window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('A message from CareCycle')}&body=${encoded}`; return 'opened' }
    if (method === 'WhatsApp') { window.location.href = `https://wa.me/${phone.replace('+', '')}?text=${encoded}`; return 'opened' }
    await Share.share({ title: 'CareCycle message', text: message, dialogTitle: method === 'Messenger' ? 'Choose Messenger or another app' : 'Share your message' }); return 'opened'
  } catch { return 'failed' }
}
