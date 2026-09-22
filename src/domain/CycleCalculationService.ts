import type { PeriodRecord } from './models'

const DAY = 86_400_000
const utc = (date: string) => new Date(${date}T00:00:00Z).getTime()
const format = (time: number) => new Date(time).toISOString().slice(0, 10)

export const daysBetween = (start: string, end: string) =>
  Math.round((utc(end) - utc(start)) / DAY)

export class CycleCalculationService {
  static daysBetween(start: string, end: string) {
    return daysBetween(start, end)
  }

  static validatePeriodEntry(record: Pick<PeriodRecord, 'startDate' | 'endDate'>, existing: PeriodRecord[] = []): string | null {
    const today = new Date().toISOString().slice(0, 10)
    if (!record.startDate) return 'Choose the first day of bleeding.'
    if (record.startDate > today || record.endDate && record.endDate > today) return 'Period dates cannot be in the future.'
    if (record.endDate && record.endDate < record.startDate) return 'The end date must be on or after the start date.'
    const end = record.endDate ?? record.startDate
    if (existing.some(p => p.id !== (record as PeriodRecord).id && p.startDate <= end && (p.endDate ?? p.startDate) >= record.startDate)) return 'This overlaps another recorded period.'
    return null
  }

  static sorted(records: PeriodRecord[]) {
    return [...records].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }

  static calculateCycleLength(previous: PeriodRecord, next: PeriodRecord) {
    return daysBetween(previous.startDate, next.startDate)
  }

  static cycleLengths(records: PeriodRecord[]) {
    const sorted = this.sorted(records)
    return sorted.slice(1).map((p, i) => this.calculateCycleLength(sorted[i], p)).filter(n => n > 0)
  }

  static calculateAverageCycleLength(records: PeriodRecord[]) {
    const lengths = this.cycleLengths(records)
    return lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : null
  }

  static calculateMedianCycleLength(records: PeriodRecord[]) {
    const a = this.cycleLengths(records).sort((x, y) => x - y)
    if (!a.length) return null
    const m = Math.floor(a.length / 2)
    return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2)
  }

  static calculateCycleRange(records: PeriodRecord[]) {
    const a = this.cycleLengths(records)
    return a.length ? { min: Math.min(...a), max: Math.max(...a) } : null
  }

  static calculateCycleVariability(records: PeriodRecord[]) {
    const a = this.cycleLengths(records)
    const avg = this.calculateAverageCycleLength(records)
    return a.length > 1 && avg
      ? Math.round(Math.sqrt(a.reduce((sum, n) => sum + (n - avg) ** 2, 0) / a.length) * 10) / 10
      : null
  }

  static calculateNextEstimatedPeriod(records: PeriodRecord[]) {
    const sorted = this.sorted(records)
    const avg = this.calculateAverageCycleLength(sorted)
    if (!avg || !sorted.length) return null
    return format(utc(sorted.at(-1)!.startDate) + avg * DAY)
  }

  static calculateEstimatedWindow(records: PeriodRecord[]) {
    const next = this.calculateNextEstimatedPeriod(records)
    const range = this.calculateCycleRange(records)
    if (!next || !range) return null

    const average = this.calculateAverageCycleLength(records) ?? range.max

    return {
      start: format(utc(next) - Math.max(0, range.max - average) * DAY),
      end: format(utc(next) + Math.max(0, average - range.min) * DAY)
    }
  }

  static periodDuration(record: PeriodRecord) {
    return record.endDate ? daysBetween(record.startDate, record.endDate) + 1 : 1
  }
}
