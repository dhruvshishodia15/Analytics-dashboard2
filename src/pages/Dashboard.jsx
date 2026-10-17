import { useMemo, useState } from 'react'
import {
  Activity, BadgeIndianRupee, Banknote, BriefcaseBusiness, CheckCircle2,
  CircleDollarSign, ClipboardList, Clock3, FileText, HandCoins, IndianRupee,
  PackageCheck, Target, Users,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import DataTable from '../components/DataTable'
import DetailModal from '../components/DetailModal'
import StatCard from '../components/StatCard'
import { crmActivity, deals, leads, orders, payments, quotations, teamMembers } from '../data/dummyData'
import {
  formatCompactCurrency, formatCurrency, formatDate, getDailyTotals,
  getDateRange, getPercentChange, getPreviousRange, groupTotals, downloadCsv,
  isInRange, teamForOwner,
} from '../utils/dashboardUtils'

const COLORS = ['#4869dc', '#58a58d', '#e6a448', '#9a7ad1', '#df7880', '#69a4bd']

const sectionDetails = {
  overview: ['Business overview', 'A clear view of your business performance.'],
  leads: ['Lead analytics', 'Understand your pipeline from first touch to conversion.'],
  quotations: ['Quotation analytics', 'Track proposal volume, value, and outcomes.'],
  deals: ['Deals & revenue', 'Monitor deal value, collections, and delivery progress.'],
  orders: ['Orders & delivery', 'Keep delivery progress and outstanding work in view.'],
  payments: ['Orders & payments', 'Review collections, payment statuses, and trends.'],
  activity: ['Team activity', 'See recent activity across sales and operations.'],
}

function matchesSelection(salesOwner, operationsOwner, user, department) {
  if (department === 'Sales') return Boolean(salesOwner) && (user === 'All users' || salesOwner === user)
  if (department === 'Operations') return Boolean(operationsOwner) && (user === 'All users' || operationsOwner === user)
  return user === 'All users' || salesOwner === user || operationsOwner === user
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${String(status || '').toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
}

function MiniLegend({ items }) {
  return <div className="mini-legend">{items.map((item, index) => (
    <span key={item.name}><i style={{ background: COLORS[index % COLORS.length] }} />{item.name}<b>{item.value}</b></span>
  ))}</div>
}

function TooltipContent({ active, payload, label, currency = false }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><strong>{label}</strong><span>{currency ? formatCurrency(payload[0].value) : payload[0].value}</span></div>
}

export default function Dashboard({ activeSection, filters, setSelection, selection, onCloseDetails, exportActionRef, onNavigate }) {
  const [searchValue, setSearchValue] = useState('')
  const [statusValue, setStatusValue] = useState('All')
  const [toast, setToast] = useState('')
  const { range, customStart, customEnd, user, department } = filters
  const dateRange = useMemo(() => getDateRange(range, customStart, customEnd), [range, customStart, customEnd])
  const previousRange = useMemo(() => getPreviousRange(dateRange.start, dateRange.end), [dateRange])

  const filtered = useMemo(() => {
    const inRange = (items, field) => items.filter((item) => isInRange(item[field], dateRange))
    const previous = (items, field) => items.filter((item) => isInRange(item[field], previousRange))
    const leadInRange = inRange(leads, 'createdAt')
    const dealInRange = inRange(deals, 'createdAt')
    const orderInRange = inRange(orders, 'createdAt')
    const quoteInRange = inRange(quotations, 'createdAt')
    const paymentInRange = inRange(payments, 'date')

    const filterLeads = (items) => items.filter((item) => matchesSelection(item.owner, null, user, department))
    const filterDeals = (items) => items.filter((item) => matchesSelection(item.owner, null, user, department))
    const filterQuotes = (items) => items.filter((item) => matchesSelection(item.owner, null, user, department))
    const findDealForOrder = (order) => deals.find((deal) => deal.id === order.dealId)
    const filterOrders = (items) => items.filter((item) => {
      const deal = findDealForOrder(item)
      return matchesSelection(deal?.owner, item.operationsOwner, user, department)
    })
    const findOrderForPayment = (payment) => orders.find((order) => order.id === payment.orderId)
    const filterPayments = (items) => items.filter((item) => {
      const order = findOrderForPayment(item)
      const deal = order && findDealForOrder(order)
      return matchesSelection(deal?.owner, order?.operationsOwner, user, department)
    })
    const filterActivities = (items) => items.filter((item) => {
      const member = teamForOwner(item.person)
      const matchesUser = user === 'All users' || item.person === user
      const matchesDepartment = department === 'All' || member?.department === department
      return matchesUser && matchesDepartment
    })

    const current = {
      leads: filterLeads(leadInRange),
      quotes: filterQuotes(quoteInRange),
      deals: filterDeals(dealInRange),
      orders: filterOrders(orderInRange),
      payments: filterPayments(paymentInRange),
      activities: filterActivities(inRange(crmActivity, 'date')),
    }
    const prior = {
      leads: filterLeads(previous(leads, 'createdAt')),
      quotes: filterQuotes(previous(quotations, 'createdAt')),
      deals: filterDeals(previous(deals, 'createdAt')),
      orders: filterOrders(previous(orders, 'createdAt')),
      payments: filterPayments(previous(payments, 'date')),
    }
    return {
      current, prior, findDealForOrder, findOrderForPayment,
      allPayments: filterPayments(payments),
      priorAllPayments: filterPayments(payments),
    }
  }, [dateRange, previousRange, user, department])

  const current = filtered.current
  const prior = filtered.prior
  const convertedLeads = current.leads.filter((lead) => lead.status === 'Converted').length
  const priorConvertedLeads = prior.leads.filter((lead) => lead.status === 'Converted').length
  const leadConversionRate = current.leads.length ? (convertedLeads / current.leads.length) * 100 : 0
  const priorConversionRate = prior.leads.length ? (priorConvertedLeads / prior.leads.length) * 100 : 0
  const leadConversionChange = getPercentChange(leadConversionRate, priorConversionRate)
  const totalDealValue = current.deals.reduce((sum, deal) => sum + deal.amount, 0)
  const priorDealValue = prior.deals.reduce((sum, deal) => sum + deal.amount, 0)
  const collectedRevenue = current.payments.filter((payment) => payment.status === 'Paid').reduce((sum, payment) => sum + payment.amount, 0)
  const priorCollectedRevenue = prior.payments.filter((payment) => payment.status === 'Paid').reduce((sum, payment) => sum + payment.amount, 0)
  const collectForDeals = (dealRecords, paymentRecords) => dealRecords.reduce((sum, deal) => {
    const orderIds = orders.filter((order) => order.dealId === deal.id).map((order) => order.id)
    const dealPayments = paymentRecords.filter((payment) => orderIds.includes(payment.orderId) && payment.status === 'Paid')
    return sum + dealPayments.reduce((total, payment) => total + payment.amount, 0)
  }, 0)
  const collectedForCurrentDeals = collectForDeals(current.deals, filtered.allPayments)
  const collectedForPriorDeals = collectForDeals(prior.deals, filtered.priorAllPayments)
  const outstandingRevenue = Math.max(totalDealValue - collectedForCurrentDeals, 0)
  const priorOutstandingRevenue = Math.max(priorDealValue - collectedForPriorDeals, 0)
  const quoteConversionRate = current.quotes.length
    ? (current.quotes.filter((quote) => current.deals.some((deal) => deal.leadId === quote.leadId)).length / current.quotes.length) * 100
    : 0
  const priorQuoteConversionRate = prior.quotes.length
    ? (prior.quotes.filter((quote) => prior.deals.some((deal) => deal.leadId === quote.leadId)).length / prior.quotes.length) * 100
    : 0

  const leadSourceData = groupTotals(current.leads, 'source')
  const leadStatusData = groupTotals(current.leads, 'status')
  const quoteServiceData = groupTotals(current.quotes, 'service')
  const quoteValueData = groupTotals(current.quotes, 'service', 'amount')
  const dealServiceData = groupTotals(current.deals, 'service', 'amount')
  const orderServiceData = groupTotals(current.orders, 'service')
  const paymentStatusData = groupTotals(current.payments, 'status')
  const leadTrend = getDailyTotals(current.leads, 'createdAt', null, dateRange)
  const revenueTrend = getDailyTotals(current.payments.filter((item) => item.status === 'Paid'), 'date', 'amount', dateRange)
  const collectionTrend = revenueTrend
  const funnelData = [
    { name: 'All leads', value: current.leads.length },
    { name: 'Qualified', value: current.leads.filter((lead) => lead.status === 'Qualified' || lead.status === 'Converted').length },
    { name: 'Converted', value: convertedLeads },
  ]

  const allDetailData = { leads, quotations, deals, orders, payments }
  const configs = {
    leads: {
      title: 'Lead records', subtitle: 'Click any row to review the lead and its related opportunities.',
      rows: current.leads, type: 'lead', statuses: ['New', 'Qualified', 'Converted', 'Unqualified'],
      columns: [
        { key: 'name', label: 'Lead', render: (row) => <div className="primary-cell"><strong>{row.name}</strong><span>{row.company}</span></div> },
        { key: 'source', label: 'Source' }, { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
        { key: 'owner', label: 'Owner' }, { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
        { key: 'value', label: 'Potential value', render: (row) => formatCurrency(row.value) },
      ],
    },
    quotations: {
      title: 'Service-wise quotations', subtitle: 'Every quotation is connected to the lead that requested it.',
      rows: current.quotes, type: 'quotation', statuses: ['Draft', 'Sent', 'Under review', 'Accepted', 'Declined'],
      columns: [
        { key: 'id', label: 'Quote ID' },
        { key: 'leadId', label: 'Lead / company', render: (row) => {
          const lead = leads.find((item) => item.id === row.leadId)
          return <div className="primary-cell"><strong>{lead?.name || row.leadId}</strong><span>{lead?.company}</span></div>
        } },
        { key: 'service', label: 'Service' }, { key: 'amount', label: 'Quote value', render: (row) => formatCurrency(row.amount) },
        { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
        { key: 'createdAt', label: 'Date', render: (row) => formatDate(row.createdAt) },
      ],
    },
    deals: {
      title: 'Deal pipeline', subtitle: 'Deal progress, priority, and contracted value.',
      rows: current.deals, type: 'deal', statuses: ['In progress', 'Completed'],
      columns: [
        { key: 'name', label: 'Deal', render: (row) => <div className="primary-cell"><strong>{row.name}</strong><span>{row.id}</span></div> },
        { key: 'service', label: 'Service' }, { key: 'priority', label: 'Priority' },
        { key: 'amount', label: 'Deal value', render: (row) => formatCurrency(row.amount) },
        { key: 'progress', label: 'Progress', render: (row) => <div className="progress-cell"><div className="progress-track"><i style={{ width: `${row.progress}%` }} /></div><span>{row.progress}%</span></div> },
        { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
      ],
    },
    orders: {
      title: 'Orders & delivery progress', subtitle: 'Click an order to see delivery milestones and payment history.',
      rows: current.orders, type: 'order', statuses: ['Pending', 'In progress', 'Completed', 'Overdue'],
      columns: [
        { key: 'name', label: 'Order', render: (row) => <div className="primary-cell"><strong>{row.name}</strong><span>{row.id}</span></div> },
        { key: 'service', label: 'Service' }, { key: 'operationsOwner', label: 'Owner' },
        { key: 'amount', label: 'Order value', render: (row) => formatCurrency(row.amount) },
        { key: 'progress', label: 'Progress', render: (row) => <div className="progress-cell"><div className="progress-track"><i style={{ width: `${row.progress}%` }} /></div><span>{row.progress}%</span></div> },
        { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
      ],
    },
    payments: {
      title: 'Payment history', subtitle: 'Paid, pending, and overdue collections for the selected period.',
      rows: current.payments, type: 'payment', statuses: ['Paid', 'Pending', 'Overdue'],
      columns: [
        { key: 'id', label: 'Payment ID' },
        { key: 'orderId', label: 'Order', render: (row) => {
          const order = orders.find((item) => item.id === row.orderId)
          return <div className="primary-cell"><strong>{order?.name || row.orderId}</strong><span>{row.orderId}</span></div>
        } },
        { key: 'date', label: 'Payment date', render: (row) => formatDate(row.date) },
        { key: 'method', label: 'Method' }, { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
        { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
      ],
    },
  }
  const config = configs[activeSection]
  const baseRows = config?.rows || []
  const visibleRows = baseRows.filter((row) => {
    const matchesStatus = statusValue === 'All' || row.status === statusValue
    const searchable = Object.values(row).join(' ').toLowerCase()
    return matchesStatus && searchable.includes(searchValue.toLowerCase())
  })

  function openRecord(row) {
    if (config?.type) setSelection({ type: config.type, record: row })
  }

  function exportRows() {
    const rowsToExport = config ? visibleRows : activeSection === 'activity' ? current.activities : current.leads
    const exportableRows = rowsToExport.map((row) => {
      if (activeSection === 'payments') {
        const order = orders.find((item) => item.id === row.orderId)
        return { ...row, order: order?.name || row.orderId }
      }
      if (activeSection === 'quotations') {
        const lead = leads.find((item) => item.id === row.leadId)
        return { ...row, leadName: lead?.name || row.leadId }
      }
      return row
    })
    if (!exportableRows.length) {
      setToast('There are no filtered records to export.')
      window.setTimeout(() => setToast(''), 2800)
      return
    }
    const downloaded = downloadCsv(`${activeSection}-filtered-data.csv`, exportableRows)
    if (downloaded) {
      setToast(`${exportableRows.length} ${activeSection} records exported.`)
      window.setTimeout(() => setToast(''), 2800)
    }
  }

  function resetTableFilters() {
    setSearchValue('')
    setStatusValue('All')
  }

  exportActionRef.current = exportRows

  const pageTitle = sectionDetails[activeSection]?.[0] || sectionDetails.overview[0]
  const pageSubtitle = sectionDetails[activeSection]?.[1] || sectionDetails.overview[1]
  const periodLabel = range === 'Custom Date Range'
    ? `${dateRange.start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – ${dateRange.end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : range.toLowerCase()

  return (
    <main className="main-content">
      <div className="page-heading">
        <div><div className="eyebrow">PERFORMANCE SNAPSHOT</div><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
        <span className="period-chip"><span className="live-dot" /> Showing {periodLabel}</span>
      </div>

      {activeSection === 'overview' && (
        <>
          <div className="stat-grid">
            <StatCard label="Total leads" value={current.leads.length.toLocaleString('en-IN')} change={getPercentChange(current.leads.length, prior.leads.length)} note="vs previous period" icon={Users} tone="blue" />
            <StatCard label="Qualified leads" value={current.leads.filter((lead) => lead.status === 'Qualified').length.toLocaleString('en-IN')} change={getPercentChange(current.leads.filter((lead) => lead.status === 'Qualified').length, prior.leads.filter((lead) => lead.status === 'Qualified').length)} note="vs previous period" icon={Target} tone="green" />
            <StatCard label="Deal value" value={formatCompactCurrency(totalDealValue)} change={getPercentChange(totalDealValue, priorDealValue)} note="vs previous period" icon={BriefcaseBusiness} tone="purple" />
            <StatCard label="Collected revenue" value={formatCompactCurrency(collectedRevenue)} change={getPercentChange(collectedRevenue, priorCollectedRevenue)} note="vs previous period" icon={IndianRupee} tone="orange" />
          </div>
          <div className="chart-grid chart-grid-main">
            <ChartCard title="Lead funnel" subtitle="Lead progress through your pipeline" action={<span className="soft-tag">This period</span>}>
              <div className="funnel-list">{funnelData.map((item, index) => {
                const percentage = current.leads.length ? (item.value / current.leads.length) * 100 : 0
                return <div className="funnel-row" key={item.name}><div className="funnel-label"><span>{item.name}</span><strong>{item.value}</strong></div><div className="progress-track funnel-track"><i style={{ width: `${percentage}%`, background: COLORS[index] }} /></div><span className="funnel-percent">{percentage.toFixed(0)}%</span></div>
              })}</div>
              <div className="conversion-note"><div className="conversion-icon"><Target size={17} /></div><span><strong>{leadConversionRate.toFixed(1)}%</strong> lead-to-deal conversion</span><small>{leadConversionChange === null ? 'New vs prior' : `${leadConversionChange >= 0 ? '+' : ''}${leadConversionChange.toFixed(1)}% vs prior`}</small></div>
            </ChartCard>
            <ChartCard title="Daily lead trend" subtitle="New leads added in the selected period">
              <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={leadTrend} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}><defs><linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4b6bdf" stopOpacity={0.17} /><stop offset="95%" stopColor="#4b6bdf" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0f5" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8590a3' }} minTickGap={20} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#8590a3' }} /><Tooltip content={<TooltipContent />} /><Area type="monotone" dataKey="value" stroke="#4b6bdf" strokeWidth={2.3} fill="url(#leadFill)" activeDot={{ r: 4 }} /></AreaChart></ResponsiveContainer></div>
            </ChartCard>
          </div>
          <div className="chart-grid chart-grid-secondary">
            <ChartCard title="Lead source" subtitle="Where new opportunities come from">
              <div className="donut-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={leadSourceData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={77} paddingAngle={3} stroke="none">{leadSourceData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={<TooltipContent />} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{current.leads.length}</strong><span>leads</span></div></div><MiniLegend items={leadSourceData.slice(0, 5)} /></div>
            </ChartCard>
            <ChartCard title="Lead status" subtitle="Current pipeline distribution">
              <div className="chart-area chart-area-short"><ResponsiveContainer width="100%" height="100%"><BarChart data={leadStatusData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#edf0f5" /><XAxis type="number" hide allowDecimals={false} /><YAxis type="category" dataKey="name" width={85} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#667085' }} /><Tooltip content={<TooltipContent />} /><Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={15}>{leadStatusData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
            </ChartCard>
          </div>
          <div className="overview-bottom">
            <div className="section-intro"><div><h2>Sales activity</h2><p>Latest CRM actions from your team.</p></div><button className="text-button" onClick={() => { resetTableFilters(); onNavigate('activity') }}>View activity <span>→</span></button></div>
            <div className="activity-list">{current.activities.slice(0, 4).map((item) => <div className="activity-item" key={item.id}><div className={`activity-icon activity-${item.type.toLowerCase()}`}>{item.type === 'Payment' ? <Banknote size={15} /> : item.type === 'Order' ? <PackageCheck size={15} /> : item.type === 'Deal' ? <BriefcaseBusiness size={15} /> : <Activity size={15} />}</div><div className="activity-copy"><span><strong>{item.person}</strong> {item.action} <strong>{item.subject}</strong></span><small>{formatDate(item.date)} · {item.type}</small></div></div>)}</div>
          </div>
        </>
      )}

      {activeSection === 'leads' && (
        <>
          <div className="stat-grid stat-grid-five">
            <StatCard label="Total leads" value={current.leads.length} change={getPercentChange(current.leads.length, prior.leads.length)} note="vs previous period" icon={Users} tone="blue" />
            <StatCard label="Qualified leads" value={current.leads.filter((item) => item.status === 'Qualified').length} change={getPercentChange(current.leads.filter((item) => item.status === 'Qualified').length, prior.leads.filter((item) => item.status === 'Qualified').length)} note="vs previous period" icon={Target} tone="green" />
            <StatCard label="Converted leads" value={convertedLeads} change={getPercentChange(convertedLeads, priorConvertedLeads)} note="vs previous period" icon={CheckCircle2} tone="purple" />
            <StatCard label="Unqualified leads" value={current.leads.filter((item) => item.status === 'Unqualified').length} change={getPercentChange(current.leads.filter((item) => item.status === 'Unqualified').length, prior.leads.filter((item) => item.status === 'Unqualified').length)} note="vs previous period" icon={Users} tone="orange" />
            <StatCard label="Conversion rate" value={`${leadConversionRate.toFixed(1)}%`} change={leadConversionChange} note="vs previous period" icon={Target} tone="blue" />
          </div>
          <div className="chart-grid chart-grid-main"><ChartCard title="Daily lead trend" subtitle="Lead creation over time"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={leadTrend} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f5" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8590a3' }} minTickGap={20} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#8590a3' }} /><Tooltip content={<TooltipContent />} /><Area type="monotone" dataKey="value" stroke="#4b6bdf" fill="#edf1ff" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></ChartCard><ChartCard title="Lead funnel" subtitle={`Conversion rate ${leadConversionRate.toFixed(1)}%`}><div className="funnel-list">{funnelData.map((item, index) => <div className="funnel-row" key={item.name}><div className="funnel-label"><span>{item.name}</span><strong>{item.value}</strong></div><div className="progress-track funnel-track"><i style={{ width: `${current.leads.length ? (item.value / current.leads.length) * 100 : 0}%`, background: COLORS[index] }} /></div></div>)}</div></ChartCard></div>
          <div className="single-table"><DataTable {...tableProps(config, visibleRows, searchValue, setSearchValue, statusValue, setStatusValue, openRecord)} /></div>
        </>
      )}

      {activeSection === 'quotations' && (
        <>
          <div className="stat-grid">
            <StatCard label="Total quotations" value={current.quotes.length} change={getPercentChange(current.quotes.length, prior.quotes.length)} note="vs previous period" icon={FileText} tone="blue" />
            <StatCard label="Quotation value" value={formatCompactCurrency(current.quotes.reduce((sum, item) => sum + item.amount, 0))} change={getPercentChange(current.quotes.reduce((sum, item) => sum + item.amount, 0), prior.quotes.reduce((sum, item) => sum + item.amount, 0))} note="vs previous period" icon={BadgeIndianRupee} tone="purple" />
            <StatCard label="Accepted quotes" value={current.quotes.filter((item) => item.status === 'Accepted').length} change={getPercentChange(current.quotes.filter((item) => item.status === 'Accepted').length, prior.quotes.filter((item) => item.status === 'Accepted').length)} note="vs previous period" icon={CheckCircle2} tone="green" />
            <StatCard label="Quote-to-deal rate" value={`${quoteConversionRate.toFixed(1)}%`} change={getPercentChange(quoteConversionRate, priorQuoteConversionRate)} note="vs previous period" icon={Target} tone="orange" />
          </div>
          <div className="chart-grid chart-grid-main"><ChartCard title="Quotations by service" subtitle="Number of proposals by category"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={quoteServiceData} margin={{ top: 10, right: 8, left: -18, bottom: 32 }}><CartesianGrid vertical={false} stroke="#edf0f5" /><XAxis dataKey="name" interval={0} angle={-17} textAnchor="end" height={52} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7a8496' }} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#8590a3' }} /><Tooltip content={<TooltipContent />} /><Bar dataKey="value" fill="#5574df" radius={[5, 5, 0, 0]} barSize={32} /></BarChart></ResponsiveContainer></div></ChartCard><ChartCard title="Quotation value by service" subtitle="Total submitted proposal value"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={quoteValueData} layout="vertical" margin={{ top: 2, right: 16, left: 8, bottom: 2 }}><CartesianGrid horizontal={false} stroke="#edf0f5" /><XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8590a3' }} /><YAxis type="category" dataKey="name" width={115} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#667085' }} /><Tooltip content={<TooltipContent currency />} /><Bar dataKey="value" fill="#58a58d" radius={[0, 5, 5, 0]} barSize={17} /></BarChart></ResponsiveContainer></div><MiniLegend items={groupTotals(current.quotes, 'status')} /></ChartCard></div>
          <div className="single-table"><DataTable {...tableProps(config, visibleRows, searchValue, setSearchValue, statusValue, setStatusValue, openRecord)} /></div>
        </>
      )}

      {activeSection === 'deals' && (
        <>
          <div className="stat-grid">
            <StatCard label="Deals created" value={current.deals.length} change={getPercentChange(current.deals.length, prior.deals.length)} note="vs previous period" icon={BriefcaseBusiness} tone="blue" />
            <StatCard label="Total deal value" value={formatCompactCurrency(totalDealValue)} change={getPercentChange(totalDealValue, priorDealValue)} note="vs previous period" icon={CircleDollarSign} tone="purple" />
            <StatCard label="Collected revenue" value={formatCompactCurrency(collectedForCurrentDeals)} change={getPercentChange(collectedForCurrentDeals, collectedForPriorDeals)} note="for deals created in period" icon={HandCoins} tone="green" />
            <StatCard label="Outstanding revenue" value={formatCompactCurrency(outstandingRevenue)} change={getPercentChange(outstandingRevenue, priorOutstandingRevenue)} note="deal value less collected" icon={Clock3} tone="orange" />
          </div>
          <div className="chart-grid chart-grid-main"><ChartCard title="Daily revenue trend" subtitle="Payments received in this period"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueTrend} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#58a58d" stopOpacity={0.18} /><stop offset="95%" stopColor="#58a58d" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0f5" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8590a3' }} minTickGap={20} /><YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8590a3' }} /><Tooltip content={<TooltipContent currency />} /><Area type="monotone" dataKey="value" stroke="#58a58d" fill="url(#revenueFill)" strokeWidth={2.2} /></AreaChart></ResponsiveContainer></div></ChartCard><ChartCard title="Revenue by service" subtitle="Value currently in the deal pipeline"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={dealServiceData} layout="vertical" margin={{ top: 4, right: 14, left: 4, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#edf0f5" /><XAxis type="number" tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8590a3' }} /><YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#667085' }} /><Tooltip content={<TooltipContent currency />} /><Bar dataKey="value" fill="#5574df" radius={[0, 5, 5, 0]} barSize={18} /></BarChart></ResponsiveContainer></div><MiniLegend items={groupTotals(current.deals, 'priority')} /></ChartCard></div>
          <div className="deal-progress-panel"><div><span className="eyebrow">PORTFOLIO PROGRESS</span><h2>Deal delivery progress</h2><p>Average completion across {current.deals.length} active and completed deals</p></div><div className="large-progress"><strong>{current.deals.length ? Math.round(current.deals.reduce((sum, item) => sum + item.progress, 0) / current.deals.length) : 0}%</strong><div className="progress-track"><i style={{ width: `${current.deals.length ? current.deals.reduce((sum, item) => sum + item.progress, 0) / current.deals.length : 0}%` }} /></div><span>{formatCompactCurrency(collectedForCurrentDeals)} collected · {formatCompactCurrency(outstandingRevenue)} outstanding</span></div></div>
          <div className="single-table"><DataTable {...tableProps(config, visibleRows, searchValue, setSearchValue, statusValue, setStatusValue, openRecord)} /></div>
        </>
      )}

      {activeSection === 'orders' && (
        <>
          <div className="stat-grid">
            <StatCard label="Total orders" value={current.orders.length} change={getPercentChange(current.orders.length, prior.orders.length)} note="vs previous period" icon={ClipboardList} tone="blue" />
            <StatCard label="Pending" value={current.orders.filter((item) => item.status === 'Pending').length} change={getPercentChange(current.orders.filter((item) => item.status === 'Pending').length, prior.orders.filter((item) => item.status === 'Pending').length)} note="awaiting work" icon={Clock3} tone="orange" />
            <StatCard label="In progress" value={current.orders.filter((item) => item.status === 'In progress').length} change={getPercentChange(current.orders.filter((item) => item.status === 'In progress').length, prior.orders.filter((item) => item.status === 'In progress').length)} note="being delivered" icon={Activity} tone="purple" />
            <StatCard label="Completed / overdue" value={`${current.orders.filter((item) => item.status === 'Completed').length} / ${current.orders.filter((item) => item.status === 'Overdue').length}`} change={getPercentChange(current.orders.filter((item) => item.status === 'Completed' || item.status === 'Overdue').length, prior.orders.filter((item) => item.status === 'Completed' || item.status === 'Overdue').length)} note="vs previous period" icon={PackageCheck} tone="green" />
          </div>
          <div className="chart-grid chart-grid-main"><ChartCard title="Orders by service" subtitle="Order volume by service category"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={orderServiceData} margin={{ top: 12, right: 6, left: -18, bottom: 28 }}><CartesianGrid vertical={false} stroke="#edf0f5" /><XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={48} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7a8496' }} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#8590a3' }} /><Tooltip content={<TooltipContent />} /><Bar dataKey="value" fill="#5574df" radius={[5, 5, 0, 0]} barSize={30} /></BarChart></ResponsiveContainer></div></ChartCard><ChartCard title="Payment status" subtitle="Payments linked to filtered orders"><div className="donut-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentStatusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={75} paddingAngle={3} stroke="none">{paymentStatusData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip content={<TooltipContent />} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{current.payments.length}</strong><span>payments</span></div></div><MiniLegend items={paymentStatusData} /></div></ChartCard></div>
          <div className="single-table"><DataTable {...tableProps(config, visibleRows, searchValue, setSearchValue, statusValue, setStatusValue, openRecord)} /></div>
        </>
      )}

      {activeSection === 'payments' && (
        <>
          <div className="stat-grid">
            <StatCard label="Collections" value={formatCompactCurrency(collectedRevenue)} change={getPercentChange(collectedRevenue, priorCollectedRevenue)} note="paid in this period" icon={IndianRupee} tone="green" />
            <StatCard label="Payments received" value={current.payments.filter((item) => item.status === 'Paid').length} change={getPercentChange(current.payments.filter((item) => item.status === 'Paid').length, prior.payments.filter((item) => item.status === 'Paid').length)} note="paid transactions" icon={CheckCircle2} tone="blue" />
            <StatCard label="Pending amount" value={formatCompactCurrency(current.payments.filter((item) => item.status === 'Pending').reduce((sum, item) => sum + item.amount, 0))} change={getPercentChange(current.payments.filter((item) => item.status === 'Pending').reduce((sum, item) => sum + item.amount, 0), prior.payments.filter((item) => item.status === 'Pending').reduce((sum, item) => sum + item.amount, 0))} note="vs previous period" icon={Clock3} tone="orange" />
            <StatCard label="Overdue amount" value={formatCompactCurrency(current.payments.filter((item) => item.status === 'Overdue').reduce((sum, item) => sum + item.amount, 0))} change={getPercentChange(current.payments.filter((item) => item.status === 'Overdue').reduce((sum, item) => sum + item.amount, 0), prior.payments.filter((item) => item.status === 'Overdue').reduce((sum, item) => sum + item.amount, 0))} note="vs previous period" icon={BadgeIndianRupee} tone="purple" />
          </div>
          <div className="chart-grid chart-grid-main"><ChartCard title="Daily collections" subtitle="Paid transactions over the selected period"><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={collectionTrend} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f5" /><XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8590a3' }} minTickGap={20} /><YAxis tickFormatter={formatCompactCurrency} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8590a3' }} /><Tooltip content={<TooltipContent currency />} /><Area type="monotone" dataKey="value" stroke="#58a58d" fill="#e8f4f0" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></ChartCard><ChartCard title="Payment status" subtitle="Transaction count by current state"><div className="chart-area chart-area-short"><ResponsiveContainer width="100%" height="100%"><BarChart data={paymentStatusData} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f5" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#667085' }} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: '#8590a3' }} /><Tooltip content={<TooltipContent />} /><Bar dataKey="value" fill="#5574df" radius={[5, 5, 0, 0]} barSize={35} /></BarChart></ResponsiveContainer></div></ChartCard></div>
          <div className="single-table"><DataTable {...tableProps(config, visibleRows, searchValue, setSearchValue, statusValue, setStatusValue, openRecord)} /></div>
        </>
      )}

      {activeSection === 'activity' && <ActivitySection activities={current.activities} orders={current.orders} deals={current.deals} setSelection={setSelection} onExport={exportRows} />}

      {config && (
        <div className="table-export">
          <span>Click a record to open its details and related history.</span>
          <button className="text-button" onClick={exportRows}><FileText size={15} /> Export filtered {activeSection}</button>
        </div>
      )}
      {activeSection === 'overview' && (
        <div className="table-export">
          <span>Export the leads currently matching your filters.</span>
          <button className="text-button" onClick={exportRows}><FileText size={15} /> Export filtered leads</button>
        </div>
      )}
      {toast && <div className="toast-message">{toast}</div>}
      <DetailModal selection={selection} data={allDetailData} onClose={onCloseDetails} onSelect={setSelection} />
    </main>
  )
}

function tableProps(config, rows, searchValue, onSearchChange, statusValue, onStatusChange, onRowClick) {
  return {
    title: config.title, subtitle: config.subtitle, rows, columns: config.columns,
    searchValue, onSearchChange, statusValue, onStatusChange, statusOptions: config.statuses, onRowClick,
  }
}

function ActivitySection({ activities, orders: visibleOrders, deals: visibleDeals, setSelection, onExport }) {
  const salesActivity = activities.filter((item) => teamForOwner(item.person)?.department === 'Sales')
  const operationsActivity = activities.filter((item) => teamForOwner(item.person)?.department === 'Operations')
  const stageRows = visibleOrders.slice(0, 6)
  return (
    <>
      <div className="activity-summary-grid">
        <section className="panel team-panel"><div className="panel-header"><div><h2>Sales team activity</h2><p>Lead and opportunity progress</p></div><span className="soft-tag">{salesActivity.length} updates</span></div>{salesActivity.length ? salesActivity.slice(0, 6).map((item) => <ActivityRow item={item} key={item.id} />) : <p className="muted-empty">No sales activity in this period.</p>}</section>
        <section className="panel team-panel"><div className="panel-header"><div><h2>Operations activity</h2><p>Delivery and collection updates</p></div><span className="soft-tag">{operationsActivity.length} updates</span></div>{operationsActivity.length ? operationsActivity.slice(0, 6).map((item) => <ActivityRow item={item} key={item.id} />) : <p className="muted-empty">No operations activity in this period.</p>}</section>
      </div>
      <section className="panel stage-panel"><div className="panel-header"><div><h2>Order and stage progress</h2><p>Delivery progress by active order</p></div><span className="soft-tag">{visibleDeals.length} deals in view</span></div><div className="stage-list">{stageRows.length ? stageRows.map((order) => <button className="stage-row" key={order.id} onClick={() => setSelection({ type: 'order', record: order })}><span className="stage-name"><strong>{order.name}</strong><small>{order.service} · {order.id}</small></span><span className="progress-track"><i style={{ width: `${order.progress}%` }} /></span><b>{order.progress}%</b><StatusPill status={order.status} /></button>) : <p className="muted-empty">No orders in this period.</p>}</div></section>
      <div className="table-export"><span>Activity reflects the selected date, user, and department filters.</span><button className="text-button" onClick={onExport}><FileText size={15} /> Export activity</button></div>
    </>
  )
}

function ActivityRow({ item }) {
  return <div className="team-activity-row"><span className={`avatar avatar-${teamForOwner(item.person)?.department === 'Sales' ? 'blue' : 'green'}`}>{item.person.split(' ').map((part) => part[0]).join('')}</span><div className="activity-copy"><span><strong>{item.person}</strong> {item.action} <strong>{item.subject}</strong></span><small>{formatDate(item.date)} · {item.type}</small></div><span className="activity-row-type">{item.type}</span></div>
}
