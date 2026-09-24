import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Users, ShoppingCart, Package, Wallet, Settings, LogOut, Scissors, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'receptionist', 'stylist'] },
  { to: '/appointments', label: 'Appointments', icon: CalendarCheck, roles: ['admin', 'manager', 'receptionist', 'stylist'] },
  { to: '/customers', label: 'Customers CRM', icon: Users, roles: ['admin', 'manager', 'receptionist'] },
  { to: '/pos', label: 'POS & Billing', icon: ShoppingCart, roles: ['admin', 'manager', 'receptionist'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'manager'] },
  { to: '/finance', label: 'Finance & Payroll', icon: Wallet, roles: ['admin', 'manager'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const role = user?.role || 'receptionist';
  const visible = links.filter((l) => l.roles.includes(role));

  return (
    <div className="min-h-screen flex bg-[#faf6ef]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#fffdf8] border-r border-[#eee2cf] sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <span className="w-9 h-9 rounded-xl bg-[#221512] text-[#e8c987] flex items-center justify-center"><Scissors className="w-5 h-5" /></span>
          <span className="font-display text-xl font-bold text-[#221512]">Lumière <span className="gold-text">Salon</span></span>
        </Link>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <Link to="/" className="navlink"><Store className="w-5 h-5" /> Public Site</Link>
          <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#b3a08a]">Management</div>
          {visible.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}>
              <l.icon className="w-5 h-5" /> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-[#eee2cf]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#221512] text-[#e8c987] flex items-center justify-center font-bold">
              {(user?.name || 'U').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#221512] truncate">{user?.name}</p>
              <p className="text-xs text-[#8a7460] capitalize">{user?.role} · {user?.branch_name || 'All branches'}</p>
            </div>
            <button title="Sign out" className="p-2 rounded-lg hover:bg-[#f3ebdd]" onClick={() => { logout(); nav('/login'); }}>
              <LogOut className="w-4 h-4 text-[#8a7460]" />
            </button>
          </div>
        </div>
      </aside>
      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-40 bg-[#fffdf8] border-b border-[#eee2cf] px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#221512] text-[#e8c987] flex items-center justify-center"><Scissors className="w-4 h-4" /></span>
            <span className="font-display font-bold text-[#221512]">Lumière Salon</span>
          </Link>
          <button className="btn btn-line btn-sm" onClick={() => { logout(); nav('/login'); }}><LogOut className="w-4 h-4" /></button>
        </div>
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto pb-24 md:pb-8">{children}</main>
        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#fffdf8] border-t border-[#eee2cf] flex overflow-x-auto px-2 py-2">
          {visible.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold min-w-[64px] ${isActive ? 'text-[#221512] bg-[#f3ebdd]' : 'text-[#8a7460]'}`}>
              <l.icon className="w-5 h-5" /> {l.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
