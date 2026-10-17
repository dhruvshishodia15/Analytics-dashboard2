import { Activity, ArrowLeftRight, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList, CreditCard, LayoutDashboard, Users, X } from 'lucide-react'

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'leads', label: 'Lead analytics', icon: Users },
  { id: 'quotations', label: 'Quotations', icon: ClipboardList },
  { id: 'deals', label: 'Deals & revenue', icon: BriefcaseBusiness },
  { id: 'orders', label: 'Orders', icon: ArrowLeftRight },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'activity', label: 'Team activity', icon: Activity },
]

export default function Sidebar({ activeSection, onNavigate, isOpen, onClose }) {
  return (
    <>
      {isOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ChartNoAxesCombined size={20} /></div>
          <div><strong>northstar</strong><span>BUSINESS INTELLIGENCE</span></div>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeSection === id ? 'nav-item-active' : ''}`} onClick={() => onNavigate(id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {activeSection === id && <span className="active-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><ChartNoAxesCombined size={16} /></div>
            <strong>Performance at a glance</strong>
            <span>Your business, in focus.</span>
          </div>
          <div className="profile-row">
            <div className="avatar avatar-navy">DR</div>
            <div className="profile-copy"><strong>Dhruv Rana</strong><span>Administrator</span></div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>
    </>
  )
}
