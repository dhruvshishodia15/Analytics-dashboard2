const DAY_IN_MS = 24 * 60 * 60 * 1000

function dateAtMidnight(value) {
  const date = new Date(`${value}T00:00:00`)
  date.setHours(0, 0, 0, 0)
  return date
}

function toDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDateRange(range, customStart, customEnd) {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const days = range === 'Today' ? 1 : range === 'Last 7 Days' ? 7 : 30
  const start = new Date(end.getTime() - (days - 1) * DAY_IN_MS)

  if (range === 'Custom Date Range') {
    const customStartDate = dateAtMidnight(customStart)
    const customEndDate = dateAtMidnight(customEnd)
    if (!Number.isNaN(customStartDate.getTime()) && !Number.isNaN(customEndDate.getTime()) && customStartDate <= customEndDate) {
      return { start: customStartDate, end: customEndDate }
    }
  }

  return { start, end }
}

export function getPreviousRange(start, end) {
  const days = Math.floor((end.getTime() - start.getTime()) / DAY_IN_MS) + 1
  const previousEnd = new Date(start.getTime() - DAY_IN_MS)
  const previousStart = new Date(previousEnd.getTime() - (days - 1) * DAY_IN_MS)
  return { start: previousStart, end: previousEnd }
}

export function isInRange(dateValue, range) {
  if (!dateValue) return false
  const date = dateAtMidnight(dateValue)
  return date >= range.start && date <= range.end
}

export function filterByDate(items, dateKey, range) {
  return items.filter((item) => isInRange(item[dateKey], range))
}

export function filterByTeam(items, user, department, getOwner = (item) => item.owner) {
  return items.filter((item) => {
    const owner = getOwner(item)
    const member = teamForOwner(owner)
    const matchesUser = user === 'All users' || owner === user
    const matchesDepartment = department === 'All' || member?.department === department
    return matchesUser && matchesDepartment
  })
}

export function teamForOwner(owner) {
  return [
    { name: 'Aarav Mehta', department: 'Sales' },
    { name: 'Diya Shah', department: 'Sales' },
    { name: 'Kabir Rao', department: 'Sales' },
    { name: 'Mira Nair', department: 'Operations' },
    { name: 'Rohan Das', department: 'Operations' },
  ].find((member) => member.name === owner)
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatCompactCurrency(value) {
  const amount = value || 0
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`
  return formatCurrency(amount)
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getPercentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

export function getDailyTotals(items, dateKey, valueKey, range) {
  const days = Math.floor((range.end.getTime() - range.start.getTime()) / DAY_IN_MS) + 1
  const interval = days <= 1 ? 1 : days <= 7 ? 1 : Math.ceil(days / 10)
  const groups = new Map()

  for (let offset = 0; offset < days; offset += interval) {
    const date = new Date(range.start.getTime() + offset * DAY_IN_MS)
    groups.set(toDateString(date), { date: toDateString(date), label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: 0 })
  }

  items.forEach((item) => {
    const itemDate = dateAtMidnight(item[dateKey])
    const offset = Math.floor((itemDate.getTime() - range.start.getTime()) / DAY_IN_MS)
    const bucket = new Date(range.start.getTime() + Math.floor(offset / interval) * interval * DAY_IN_MS)
    const key = toDateString(bucket)
    if (groups.has(key)) groups.get(key).value += valueKey ? item[valueKey] : 1
  })

  return Array.from(groups.values())
}

export function groupTotals(items, groupKey, valueKey) {
  const totals = new Map()
  items.forEach((item) => {
    const label = item[groupKey] || 'Other'
    totals.set(label, (totals.get(label) || 0) + (valueKey ? item[valueKey] : 1))
  })
  return Array.from(totals, ([name, value]) => ({ name, value }))
}

export function downloadCsv(fileName, rows) {
  if (!rows.length) return false
  const columns = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const contents = [columns.map(escape).join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\r\n')
  const file = new Blob([contents], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  return true
}
