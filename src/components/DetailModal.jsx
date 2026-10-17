import { X } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/dashboardUtils'

function StatusPill({ status }) {
  const className = String(status || '').toLowerCase().replaceAll(' ', '-')
  return <span className={`status-pill status-${className}`}>{status || '—'}</span>
}

export default function DetailModal({ selection, data, onClose, onSelect }) {
  if (!selection) return null
  const { type, record } = selection
  const lead = type === 'lead' ? record : data.leads.find((item) => item.id === record.leadId)
  const deal = type === 'deal' ? record : data.deals.find((item) => item.id === record.dealId)
  const order = type === 'order' ? record : type === 'payment' ? data.orders.find((item) => item.id === record.orderId) : null
  const relatedQuotes = data.quotations.filter((item) => item.leadId === lead?.id)
  const relatedDeals = data.deals.filter((item) => item.leadId === lead?.id)
  const relatedOrders = data.orders.filter((item) => item.dealId === deal?.id)
  const relatedPayments = data.payments.filter((item) => item.orderId === order?.id || (type === 'deal' && relatedOrders.some((related) => related.id === item.orderId)))

  const title = type === 'lead' ? lead?.name
    : type === 'quotation' ? record.id
      : type === 'deal' ? record.name
        : type === 'order' ? record.name : record.id

  const facts = type === 'lead'
    ? [['Company', lead?.company], ['Lead ID', lead?.id], ['Source', lead?.source], ['Owner', lead?.owner], ['Created', formatDate(lead?.createdAt)], ['Est. value', formatCurrency(lead?.value)]]
    : type === 'quotation'
      ? [['Quote ID', record.id], ['Service', record.service], ['Value', formatCurrency(record.amount)], ['Created', formatDate(record.createdAt)], ['Owner', record.owner]]
      : type === 'deal'
        ? [['Deal ID', record.id], ['Service', record.service], ['Value', formatCurrency(record.amount)], ['Priority', record.priority], ['Owner', record.owner], ['Progress', `${record.progress}%`]]
        : type === 'order'
          ? [['Order ID', record.id], ['Service', record.service], ['Value', formatCurrency(record.amount)], ['Due date', formatDate(record.dueDate)], ['Operations owner', record.operationsOwner], ['Progress', `${record.progress}%`]]
          : [['Payment ID', record.id], ['Amount', formatCurrency(record.amount)], ['Payment date', formatDate(record.date)], ['Method', record.method], ['Order', order?.name]]

  const sections = type === 'lead'
    ? [{ title: 'Quotations', type: 'quotation', rows: relatedQuotes, label: (item) => `${item.id} · ${item.service}`, value: (item) => formatCurrency(item.amount) },
      { title: 'Deals', type: 'deal', rows: relatedDeals, label: (item) => item.name, value: (item) => formatCurrency(item.amount) }]
    : type === 'quotation'
      ? [{ title: 'Associated lead', type: 'lead', rows: lead ? [lead] : [], label: (item) => `${item.name} · ${item.company}`, value: (item) => item.id }]
      : type === 'deal'
        ? [{ title: 'Orders', type: 'order', rows: relatedOrders, label: (item) => item.name, value: (item) => formatCurrency(item.amount) },
          { title: 'Payments', type: 'payment', rows: relatedPayments, label: (item) => `${item.id} · ${formatDate(item.date)}`, value: (item) => formatCurrency(item.amount) }]
        : type === 'order'
          ? [{ title: 'Payment history', type: 'payment', rows: relatedPayments, label: (item) => `${item.id} · ${formatDate(item.date)}`, value: (item) => formatCurrency(item.amount) }]
          : [{ title: 'Related order', type: 'order', rows: order ? [order] : [], label: (item) => item.name, value: (item) => formatCurrency(item.amount) }]

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><span className="eyebrow">{type} details</span><h2 id="detail-title">{title}</h2></div>
          <button className="icon-button" aria-label="Close details" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="detail-status">{type === 'quotation' ? <StatusPill status={record.status} /> : type === 'payment' ? <StatusPill status={record.status} /> : <StatusPill status={record.status} />}</div>
        <div className="fact-grid">{facts.map(([label, value]) => <div className="fact-item" key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}</div>
        {lead && type !== 'lead' && <div className="linked-lead">Lead: <button onClick={() => onSelect({ type: 'lead', record: lead })}>{lead.name} · {lead.company}</button></div>}
        {sections.map((section) => (
          <div className="related-section" key={section.title}>
            <h3>{section.title}<span>{section.rows.length}</span></h3>
            {section.rows.length === 0 ? <p className="muted-empty">No related records.</p> : section.rows.map((item) => (
              <button className="related-row" key={item.id} onClick={() => onSelect({ type: section.type, record: item })}>
                <span>{section.label(item)} {item.status && <StatusPill status={item.status} />}</span><strong>{section.value(item)}</strong>
              </button>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}
