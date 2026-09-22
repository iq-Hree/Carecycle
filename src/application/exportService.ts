import type { CareData } from '../domain/models'
export function downloadData(data: CareData, type: 'json' | 'csv') {
  const content = type === 'json' ? JSON.stringify(data, null, 2) : ['date,mood,energy,pain,symptoms,note', ...data.checkins.map(c => [c.date,c.mood ?? '',c.energy ?? '',c.pain ?? '',c.symptoms.join(';'),(c.note ?? '').replaceAll(',', ' ')].join(','))].join('\n')
  const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `carecycle-export.${type}`; a.click(); URL.revokeObjectURL(url)
}
