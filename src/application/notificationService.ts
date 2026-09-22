import { LocalNotifications } from '@capacitor/local-notifications'

/** All reminders are scheduled on-device. No token or push service is used. */
export async function setDailyCheckInReminder(enabled: boolean) {
  if (!enabled) { await LocalNotifications.cancel({ notifications: [{ id: 1 }] }); return }
  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') throw new Error('Notification permission was not granted.')
  await LocalNotifications.schedule({ notifications: [{ id: 1, title: 'CareCycle', body: 'Time for your daily check-in.', schedule: { on: { hour: 19, minute: 0 }, repeats: true } }] })
}
