import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = { appId: 'org.carecycle.app', appName: 'CareCycle', webDir: 'dist', server: { androidScheme: 'https' }, plugins: { LocalNotifications: { smallIcon: 'ic_stat_carecycle', iconColor: '#183052' } } }
export default config
