import { Preferences } from '@capacitor/preferences'
import { blankData, type CareData } from '../domain/models'
const KEY = 'carecycle.local-data.v1'
export const repository = {
  async load(): Promise<CareData> { const { value } = await Preferences.get({ key: KEY }); if (!value) return blankData(); try { return { ...blankData(), ...JSON.parse(value) } } catch { return blankData() } },
  async save(data: CareData) { await Preferences.set({ key: KEY, value: JSON.stringify(data) }) },
  async clear() { await Preferences.remove({ key: KEY }) },
}
