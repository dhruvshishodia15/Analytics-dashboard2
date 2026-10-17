import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export default function StatCard({ label, value, change, note, icon: Icon, tone = 'blue' }) {
  const isPositive = change === null || change >= 0
  return (
    <article className="stat-card">
      <div className="stat-topline">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon stat-icon-${tone}`}><Icon size={17} strokeWidth={1.8} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">
        <span className={`stat-change ${isPositive ? 'change-up' : 'change-down'}`}>
          {change === null ? <ArrowUpRight size={14} /> : isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change === null ? 'New' : `${Math.abs(change).toFixed(1)}%`}
        </span>
        <span className="stat-note">{note}</span>
      </div>
    </article>
  )
}
