import type { PeriodRecord } from './models'

const DAY = 86400000

const utc = (date: string): number => {
  return new Date(date + 'T00:00:00Z').getTime()
}

const format = (time: number): string => {
  return new Date(time).toISOString().slice(0, 10)
}

export const daysBetween = (start: string, end: string): number => {
  return Math.round((utc(end) - utc(start)) / DAY)
}

export class CycleCalculationService {
  static daysBetween(start: string, end: string): number {
    return daysBetween(start, end)
  }

  static validatePeriodEntry(
    record: Pick<PeriodRecord, 'startDate' | 'endDate'>,
    existing: PeriodRecord[] = []
  ): string | null {
    const today = new Date().toISOString().slice(0, 10)

    if (!record.startDate) {
      return 'Choose the first day of bleeding.'
    }

    if (
      record.startDate > today ||
      (record.endDate && record.endDate > today)
    ) {
      return 'Period dates cannot be in the future.'
    }

    if (record.endDate && record.endDate < record.startDate) {
      return 'The end date must be on or after the start date.'
    }

    const end = record.endDate || record.startDate

    const overlaps = existing.some(
      p =>
        p.id !== (record as PeriodRecord).id &&
        p.startDate <= end &&
        (p.endDate || p.startDate) >= record.startDate
    )

    if (overlaps) {
      return 'This overlaps another recorded period.'
    }

    return null
  }

  static sorted(records: PeriodRecord[]): PeriodRecord[] {
    return [...records].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    )
  }

  static calculateCycleLength(
    previous: PeriodRecord,
    next: PeriodRecord
  ): number {
    return daysBetween(previous.startDate, next.startDate)
  }

  static cycleLengths(records: PeriodRecord[]): number[] {
    const sorted = this.sorted(records)

    return sorted
      .slice(1)
      .map((period, index) =>
        this.calculateCycleLength(sorted[index], period)
      )
      .filter(n => n > 0)
  }

  static calculateAverageCycleLength(
    records: PeriodRecord[]
  ): number | null {
    const lengths = this.cycleLengths(records)

    if (!lengths.length) {
      return null
    }

    return Math.round(
      lengths.reduce((a, b) => a + b, 0) / lengths.length
    )
  }

  static calculateMedianCycleLength(
    records: PeriodRecord[]
  ): number | null {
    const values = this.cycleLengths(records).sort(
      (a, b) => a - b
    )

    if (!values.length) {
      return null
    }

    const middle = Math.floor(values.length / 2)

    if (values.length % 2 === 1) {
      return values[middle]
    }

    return Math.round(
      (values[middle - 1] + values[middle]) / 2
    )
  }

  static calculateCycleRange(
    records: PeriodRecord[]
  ): { min: number; max: number } | null {
    const lengths = this.cycleLengths(records)

    if (!lengths.length) {
      return null
    }

    return {
      min: Math.min(...lengths),
      max: Math.max(...lengths)
    }
  }

  static calculateCycleVariability(
    records: PeriodRecord[]
  ): number | null {
    const lengths = this.cycleLengths(records)
    const average = this.calculateAverageCycleLength(records)

    if (lengths.length <= 1 || average === null) {
      return null
    }

    const variance =
      lengths.reduce(
        (sum, value) => sum + Math.pow(value - average, 2),
        0
      ) / lengths.length

    return Math.round(Math.sqrt(variance) * 10) / 10
  }

  static calculateNextEstimatedPeriod(
    records: PeriodRecord[]
  ): string | null {
    const sorted = this.sorted(records)
    const average = this.calculateAverageCycleLength(sorted)

    if (average === null || !sorted.length) {
      return null
    }

    const last = sorted[sorted.length - 1]

    return format(
      utc(last.startDate) + average * DAY
    )
  }

  static calculateEstimatedWindow(
    records: PeriodRecord[]
  ): { start: string; end: string } | null {
    const next = this.calculateNextEstimatedPeriod(records)
    const range = this.calculateCycleRange(records)

    if (!next || !range) {
      return null
    }

    const average =
      this.calculateAverageCycleLength(records) || range.max

    const startOffset = Math.max(
      0,
      range.max - average
    )

    const endOffset = Math.max(
      0,
      average - range.min
    )

    return {
      start: format(
        utc(next) - startOffset * DAY
      ),
      end: format(
        utc(next) + endOffset * DAY
      )
    }
  }

  static periodDuration(record: PeriodRecord): number {
    if (record.endDate) {
      return (
        daysBetween(
          record.startDate,
          record.endDate
        ) + 1
      )
    }

    return 1
  }
}
