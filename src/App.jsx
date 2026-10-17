import { useMemo, useRef, useState } from 'react'
import FilterBar from './components/FilterBar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import { teamMembers } from './data/dummyData'

export default function App() {
  const [activeSection, setActiveSection] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selection, setSelection] = useState(null)
  const exportActionRef = useRef(null)
  const [range, setRange] = useState('Last 30 Days')
  const [customStart, setCustomStart] = useState('2026-10-01')
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10))
  const [user, setUser] = useState('All users')
  const [department, setDepartment] = useState('All')

  const filters = useMemo(() => ({ range, customStart, customEnd, user, department }), [range, customStart, customEnd, user, department])

  function navigateTo(section) {
    if (section === 'open-menu') {
      setMenuOpen(true)
      return
    }
    setActiveSection(section)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell min-h-screen bg-slate-50">
      <Sidebar activeSection={activeSection} onNavigate={navigateTo} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main">
        <FilterBar
          range={range} setRange={setRange}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
          user={user} setUser={setUser} department={department} setDepartment={setDepartment}
          teamMembers={teamMembers} onExport={() => exportActionRef.current?.()}
          onMenu={() => setMenuOpen(true)}
        />
        <Dashboard activeSection={activeSection} filters={filters} setSelection={setSelection} selection={selection} onCloseDetails={() => setSelection(null)} exportActionRef={exportActionRef} onNavigate={navigateTo} />
      </div>
    </div>
  )
}
