import { CalendarDays, Download, Menu } from 'lucide-react'

export default function FilterBar({
  range, setRange, customStart, setCustomStart, customEnd, setCustomEnd,
  user, setUser, department, setDepartment, teamMembers, onExport, onMenu,
}) {
  return (
    <header className="topbar">
      <button className="icon-button mobile-top-menu" aria-label="Open menu" onClick={onMenu}><Menu size={20} /></button>
      <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Business overview</strong></div>
      <div className="topbar-controls">
        <label className="filter-select filter-period">
          <CalendarDays size={15} />
          <select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Date range">
            <option>Today</option><option>Last 7 Days</option><option>Last 30 Days</option><option>Custom Date Range</option>
          </select>
        </label>
        {range === 'Custom Date Range' && (
          <div className="custom-dates">
            <input type="date" aria-label="Start date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
            <span>to</span>
            <input type="date" aria-label="End date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} />
          </div>
        )}
        <label className="filter-select">
          <select value={user} onChange={(event) => setUser(event.target.value)} aria-label="Filter by user">
            {teamMembers.map((member) => <option key={member.name}>{member.name}</option>)}
          </select>
        </label>
        <label className="filter-select">
          <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department">
            <option value="All">All departments</option><option>Sales</option><option>Operations</option>
          </select>
        </label>
        <button className="button-primary export-button" onClick={onExport}><Download size={15} /><span>Export</span></button>
      </div>
    </header>
  )
}
