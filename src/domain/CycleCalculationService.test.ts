import { describe, expect, it } from 'vitest'
import { CycleCalculationService as Cycle } from './CycleCalculationService'
import type { PeriodRecord } from './models'
const period = (startDate: string, endDate?: string): PeriodRecord => ({ id: startDate, startDate, endDate, createdAt: '2026-01-01T00:00:00Z' })
describe('CycleCalculationService', () => {
  it.each([[21,'2026-01-01','2026-01-22'],[28,'2026-01-01','2026-01-29'],[29,'2026-01-01','2026-01-30'],[30,'2026-01-01','2026-01-31'],[31,'2026-01-01','2026-02-01'],[35,'2026-01-01','2026-02-05']])('calculates a %i day cycle', (days, a, b) => expect(Cycle.calculateCycleLength(period(a),period(b))).toBe(days))
  it('uses UTC arithmetic across February, leap day, and years', () => { expect(Cycle.calculateCycleLength(period('2024-02-01'),period('2024-03-01'))).toBe(29); expect(Cycle.calculateCycleLength(period('2025-12-20'),period('2026-01-19'))).toBe(30) })
  it('calculates average, median, range and variability for irregular history', () => { const p=[period('2026-01-01'),period('2026-01-22'),period('2026-02-20'),period('2026-03-22')]; expect(Cycle.cycleLengths(p)).toEqual([21,29,30]); expect(Cycle.calculateAverageCycleLength(p)).toBe(27); expect(Cycle.calculateMedianCycleLength(p)).toBe(29); expect(Cycle.calculateCycleRange(p)).toEqual({min:21,max:30}); expect(Cycle.calculateCycleVariability(p)).toBeGreaterThan(0) })
  it('does not predict without enough history and predicts from recorded starts', () => { expect(Cycle.calculateNextEstimatedPeriod([period('2026-01-01')])).toBeNull(); expect(Cycle.calculateNextEstimatedPeriod([period('2026-01-01'),period('2026-01-29'),period('2026-02-26')])).toBe('2026-03-26') })
  it('rejects missing dates, inverted dates, overlap and future dates', () => { const existing=[period('2026-01-01','2026-01-05')]; expect(Cycle.validatePeriodEntry({startDate:''})).toMatch(/Choose/); expect(Cycle.validatePeriodEntry({startDate:'2026-01-05',endDate:'2026-01-04'})).toMatch(/after/); expect(Cycle.validatePeriodEntry({startDate:'2026-01-04'},existing)).toMatch(/overlaps/); expect(Cycle.validatePeriodEntry({startDate:'2999-01-01'})).toMatch(/future/) })
  it('handles same-day records and period duration', () => { const p=period('2026-03-01','2026-03-01'); expect(Cycle.periodDuration(p)).toBe(1); expect(Cycle.validatePeriodEntry({startDate:'2026-03-01'},[p])).toMatch(/overlaps/) })
})
