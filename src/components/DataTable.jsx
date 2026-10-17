import { Search } from 'lucide-react'

export default function DataTable({
  title, subtitle, rows, columns, searchValue, onSearchChange, statusValue,
  onStatusChange, statusOptions = [], onRowClick, emptyMessage = 'No records match these filters.',
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-header table-header">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        <div className="table-tools">
          <label className="table-search"><Search size={15} /><input value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search records" /></label>
          {statusOptions.length > 0 && (
            <select className="status-filter" value={statusValue} onChange={(event) => onStatusChange(event.target.value)} aria-label="Filter by status">
              <option value="All">All statuses</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td className="empty-cell" colSpan={columns.length}>{emptyMessage}</td></tr> : rows.map((row) => (
              <tr key={row.id} onClick={() => onRowClick?.(row)} className={onRowClick ? 'clickable-row' : ''}>
                {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {rows.length} records</span><span>Updated just now</span></div>
    </section>
  )
}
