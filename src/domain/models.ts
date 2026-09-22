export type Mood = 'Great' | 'Good' | 'Okay' | 'Low' | 'Difficult'
export type Energy = 'High' | 'Good' | 'Moderate' | 'Low' | 'Very low'
export type Pain = 'None' | 'Mild' | 'Moderate' | 'Strong' | 'Severe'
export type Method = 'WhatsApp' | 'Messenger' | 'SMS' | 'Email' | 'Share sheet'
export type Symptom = 'Cramps' | 'Headache' | 'Bloating' | 'Breast tenderness' | 'Fatigue' | 'Backache' | 'Nausea' | 'Acne' | 'Mood changes' | 'Other'

export interface Profile { name: string; mobile: string }
export interface PeriodRecord { id: string; startDate: string; endDate?: string; flow?: 'Light' | 'Medium' | 'Heavy'; createdAt: string }
export interface DailyCheckIn { date: string; mood?: Mood; energy?: Energy; pain?: Pain; symptoms: Symptom[]; note?: string }
export interface TrustedContact { id: string; name: string; mobile?: string; email?: string; relationship: string; preferredMethod: Method }
export interface Settings { onboarded: boolean; notifications: boolean; appLock: boolean; localShareState: 'once' | '24h' | 'until-revoked' }
export interface CareData { version: 1; profile?: Profile; periods: PeriodRecord[]; checkins: DailyCheckIn[]; contacts: TrustedContact[]; settings: Settings }
export const blankData = (): CareData => ({ version: 1, periods: [], checkins: [], contacts: [], settings: { onboarded: false, notifications: false, appLock: false, localShareState: 'once' } })
